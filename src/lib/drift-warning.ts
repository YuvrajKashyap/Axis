import { Client, Receiver } from "@upstash/qstash";
import { computeDriftState } from "@/lib/drift";
import {
  DRIFT_WARNING_LEAD_HOURS,
  getEffectiveDriftThresholdHours,
  type DomainCommitmentRequirementValue,
  type DomainDriftModeValue,
} from "@/lib/domain-settings";
import { DEMO_EMAIL } from "@/lib/get-data";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const DRIFT_WARNING_TOLERANCE_MS = 90 * 60 * 1000;
const DRIFT_WARNING_LEAD_MS = DRIFT_WARNING_LEAD_HOURS * 60 * 60 * 1000;

const qstashClient = process.env.QSTASH_TOKEN
  ? new Client({ token: process.env.QSTASH_TOKEN })
  : null;

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type DriftWarningPayload = {
  domainId: string;
  expectedWarningAt: string;
  expectedActivityAt: string;
};

type DomainWarningContext = {
  id: string;
  name: string;
  slug: string;
  status: "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED";
  userId: string;
  driftMode: DomainDriftModeValue;
  driftThresholdHours: number;
  commitmentRequirement: DomainCommitmentRequirementValue;
  lastPassiveAlignmentAt: Date | null;
  lastDriftWarningSentAt: Date | null;
  lastDriftWarningActivityAt: Date | null;
  user: {
    email: string;
  };
  commitments: {
    createdAt: Date;
    text: string;
  }[];
};

async function getDomainWarningContext(
  domainId: string,
): Promise<DomainWarningContext | null> {
  return prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      userId: true,
      driftMode: true,
      driftThresholdHours: true,
      commitmentRequirement: true,
      lastPassiveAlignmentAt: true,
      lastDriftWarningSentAt: true,
      lastDriftWarningActivityAt: true,
      user: {
        select: {
          email: true,
        },
      },
      commitments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
          text: true,
        },
      },
    },
  });
}

function buildWarningPayload(
  domain: DomainWarningContext,
  nowMs: number = Date.now(),
) {
  const lastCommitmentAt = domain.commitments[0]?.createdAt ?? null;
  const latestCommitmentText = domain.commitments[0]?.text ?? null;
  const driftState = computeDriftState({
    status: domain.status,
    driftMode: domain.driftMode,
    driftThresholdHours: domain.driftThresholdHours,
    commitmentRequirement: domain.commitmentRequirement,
    lastCommitmentAt,
    lastPassiveAlignmentAt: domain.lastPassiveAlignmentAt,
    nowMs,
  });

  const driftThresholdHours = getEffectiveDriftThresholdHours({
    driftMode: domain.driftMode,
    driftThresholdHours: domain.driftThresholdHours,
  });
  const driftDisabled = driftThresholdHours === null;
  const warningEligible =
    !driftDisabled &&
    driftThresholdHours > DRIFT_WARNING_LEAD_HOURS &&
    domain.status !== "ARCHIVED" &&
    domain.status !== "DRIFTING" &&
    !driftState.autoDrifted &&
    domain.user.email !== DEMO_EMAIL;

  const warningAt =
    warningEligible && driftState.nextDriftAt
      ? new Date(driftState.nextDriftAt.getTime() - DRIFT_WARNING_LEAD_MS)
      : null;

  return {
    driftState,
    driftThresholdHours,
    driftDisabled,
    warningEligible,
    warningAt,
    latestCommitmentText,
    remainingMs: driftState.nextDriftAt
      ? driftState.nextDriftAt.getTime() - nowMs
      : null,
  };
}

function getAppBaseUrl() {
  return process.env.APP_BASE_URL?.replace(/\/$/, "") ?? null;
}

function buildDomainUrl(slug: string) {
  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) return null;
  return new URL(`/domain/${slug}`, appBaseUrl).toString();
}

async function sendDriftWarningEmail(domain: DomainWarningContext) {
  if (!resendClient) return { sent: false, reason: "resend-not-configured" as const };
  if (!process.env.RESEND_FROM_EMAIL) {
    return { sent: false, reason: "resend-from-missing" as const };
  }

  const latestCommitmentText = domain.commitments[0]?.text?.trim() || null;
  const domainUrl = buildDomainUrl(domain.slug);
  const latestCommitmentHtml = latestCommitmentText
    ? `<p style="margin:20px 0 0;color:#71717a;font-size:13px;line-height:1.6;"><strong style="color:#e4e4e7;">Latest commitment:</strong> ${escapeHtml(latestCommitmentText)}</p>`
    : "";
  const latestCommitmentTextBlock = latestCommitmentText
    ? `\n\nLatest commitment: ${latestCommitmentText}`
    : "";

  const { error } = await resendClient.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: [domain.user.email],
    subject: `Axis: ${domain.name} drifts in 12 hours`,
    html: `
      <div style="background:#09090b;color:#f4f4f5;padding:32px;font-family:Inter,Helvetica,Arial,sans-serif;">
        <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#71717a;">Axis</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;font-weight:600;">${escapeHtml(domain.name)} drifts in 12 hours.</h1>
        <p style="margin:0;color:#d4d4d8;font-size:15px;line-height:1.7;">Recommit or let it drift.</p>
        ${latestCommitmentHtml}
        ${
          domainUrl
            ? `<p style="margin:28px 0 0;"><a href="${domainUrl}" style="display:inline-block;border:1px solid rgba(255,255,255,0.14);padding:12px 18px;color:#f4f4f5;text-decoration:none;letter-spacing:0.18em;text-transform:uppercase;font-size:11px;">Open ${escapeHtml(domain.name)}</a></p>`
            : ""
        }
      </div>
    `,
    text: `Axis\n\n${domain.name} drifts in 12 hours.\nRecommit or let it drift.${latestCommitmentTextBlock}${domainUrl ? `\n\nOpen: ${domainUrl}` : ""}`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { sent: true as const };
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function processDomainDriftWarning(
  payload: DriftWarningPayload,
  options: { bypassTimingTolerance?: boolean } = {},
) {
  const domain = await getDomainWarningContext(payload.domainId);
  if (!domain) {
    return { sent: false, reason: "domain-not-found" as const };
  }

  const nowMs = Date.now();
  const warning = buildWarningPayload(domain, nowMs);
  const currentActivityAt = warning.driftState.lastRelevantActivityAt;

  if (!warning.warningEligible || !warning.warningAt || !currentActivityAt) {
    return { sent: false, reason: "not-eligible" as const };
  }

  if (currentActivityAt.toISOString() !== payload.expectedActivityAt) {
    return { sent: false, reason: "stale-activity" as const };
  }

  if (warning.warningAt.toISOString() !== payload.expectedWarningAt) {
    return { sent: false, reason: "stale-warning-window" as const };
  }

  if (
    domain.lastDriftWarningActivityAt?.toISOString() === currentActivityAt.toISOString()
  ) {
    return { sent: false, reason: "already-sent" as const };
  }

  if (
    !options.bypassTimingTolerance &&
    Math.abs(nowMs - warning.warningAt.getTime()) > DRIFT_WARNING_TOLERANCE_MS
  ) {
    return { sent: false, reason: "outside-warning-window" as const };
  }

  if (!options.bypassTimingTolerance && warning.remainingMs !== null && warning.remainingMs <= 0) {
    return { sent: false, reason: "already-drifted" as const };
  }

  const sendResult = await sendDriftWarningEmail(domain);
  if (!sendResult.sent) {
    return sendResult;
  }

  await prisma.domain.update({
    where: { id: domain.id },
    data: {
      lastDriftWarningSentAt: new Date(nowMs),
      lastDriftWarningActivityAt: currentActivityAt,
    },
  });

  return { sent: true as const };
}

export async function scheduleDomainDriftWarning(domainId: string) {
  const domain = await getDomainWarningContext(domainId);
  if (!domain) {
    return { scheduled: false, reason: "domain-not-found" as const };
  }

  const warning = buildWarningPayload(domain);
  const currentActivityAt = warning.driftState.lastRelevantActivityAt;

  if (!warning.warningEligible || !warning.warningAt || !currentActivityAt) {
    return { scheduled: false, reason: "not-eligible" as const };
  }

  if (warning.driftThresholdHours !== null && warning.driftThresholdHours <= DRIFT_WARNING_LEAD_HOURS) {
    return { scheduled: false, reason: "threshold-too-short" as const };
  }

  if (
    domain.lastDriftWarningActivityAt?.toISOString() === currentActivityAt.toISOString()
  ) {
    return { scheduled: false, reason: "already-warned" as const };
  }

  const nowMs = Date.now();
  const payload: DriftWarningPayload = {
    domainId: domain.id,
    expectedWarningAt: warning.warningAt.toISOString(),
    expectedActivityAt: currentActivityAt.toISOString(),
  };

  if (warning.warningAt.getTime() <= nowMs) {
    const result = await processDomainDriftWarning(payload, {
      bypassTimingTolerance: true,
    });
    return {
      scheduled: false,
      reason: result.sent ? ("processed-now" as const) : result.reason,
    };
  }

  if (!qstashClient) {
    return { scheduled: false, reason: "qstash-not-configured" as const };
  }

  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    return { scheduled: false, reason: "app-base-url-missing" as const };
  }

  const delaySeconds = Math.max(
    1,
    Math.ceil((warning.warningAt.getTime() - nowMs) / 1000),
  );

  await qstashClient.publishJSON({
    url: `${appBaseUrl}/api/qstash/drift-warning`,
    body: payload,
    headers: {
      "Content-Type": "application/json",
    },
    delay: delaySeconds,
    retries: 3,
  });

  return { scheduled: true as const };
}

export async function verifyQStashRequest(request: Request, rawBody: string) {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = request.headers.get("upstash-signature");

  if (!currentSigningKey || !nextSigningKey || !signature) {
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  try {
    return await receiver.verify({
      signature,
      body: rawBody,
      url: request.url,
    });
  } catch {
    return false;
  }
}
