import { Client, Receiver } from "@upstash/qstash";
import { computeDriftState } from "@/lib/drift";
import {
  DEFAULT_DOMAIN_SETTINGS,
  formatDriftThresholdLabel,
  getEffectiveDriftThresholdHours,
  getEffectiveWarningLeadHours,
  type DomainCommitmentRequirementValue,
  type DomainDriftModeValue,
} from "@/lib/domain-settings";
import { DEMO_USER_ID } from "@/lib/get-data";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Resend } from "resend";

const DRIFT_WARNING_TOLERANCE_MS = 90 * 60 * 1000;

const qstashClient = process.env.QSTASH_TOKEN
  ? new Client({
      token: process.env.QSTASH_TOKEN,
      ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}),
    })
  : null;

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type DriftWarningPayload = {
  domainId: string;
  expectedWarningAt: string;
  expectedActivityAt: string;
  recipientEmail?: string;
};

type WarningScheduleOverrides = {
  source?:
    | "commitment"
    | "passive-alignment"
    | "subtasks"
    | "settings-save"
    | "status-update"
    | "unknown";
  status?: "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED";
  lastCommitmentAt?: Date | null;
  lastCommitmentText?: string | null;
  lastPassiveAlignmentAt?: Date | null;
  recipientEmail?: string | null;
};

type DomainWarningContext = {
  id: string;
  name: string;
  slug: string;
  status: "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED";
  userId: string;
  driftMode: DomainDriftModeValue;
  driftThresholdHours: number;
  warningLeadHours: number | null;
  commitmentRequirement: DomainCommitmentRequirementValue;
  lastPassiveAlignmentAt: Date | null;
  lastDriftWarningSentAt: Date | null;
  lastDriftWarningActivityAt: Date | null;
  recipientEmail: string | null;
  commitments: {
    createdAt: Date;
    text: string;
  }[];
};

type DomainWarningRow = {
  id: string;
  name: string;
  slug: string;
  status: "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED";
  user_id: string;
  drift_mode: DomainDriftModeValue | null;
  drift_threshold_hours: number | null;
  warning_lead_hours: number | null;
  commitment_requirement: DomainCommitmentRequirementValue | null;
  last_passive_alignment_at: string | null;
  last_drift_warning_sent_at: string | null;
  last_drift_warning_activity_at: string | null;
};

type CommitmentRow = {
  created_at: string;
  text: string;
};

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

async function createWarningDataClient() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return createSupabaseServerClient();
  }
}

async function getCurrentAuthenticatedEmailForUserId(userId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId || !user.email) {
    return null;
  }

  return user.email;
}

async function getEmailForWarningRecipient(
  userId: string,
  recipientEmailHint?: string | null,
) {
  if (recipientEmailHint) {
    return recipientEmailHint;
  }

  const sessionEmail = await getCurrentAuthenticatedEmailForUserId(userId);
  if (sessionEmail) {
    return sessionEmail;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (!error && data.user?.email) {
      return data.user.email;
    }
  } catch {
    // Fall back to null when admin lookup is unavailable.
  }

  return null;
}

async function getDomainWarningContext(
  domainId: string,
  recipientEmailHint?: string | null,
  overrides?: WarningScheduleOverrides,
): Promise<DomainWarningContext | null> {
  const supabase = await createWarningDataClient();
  const { data: domain, error: domainError } = await supabase
    .schema("axis")
    .from("domains")
    .select(
      "id, name, slug, status, user_id, drift_mode, drift_threshold_hours, warning_lead_hours, commitment_requirement, last_passive_alignment_at, last_drift_warning_sent_at, last_drift_warning_activity_at",
    )
    .eq("id", domainId)
    .maybeSingle<DomainWarningRow>();

  if (domainError) {
    throw new Error(`Failed to load drift warning domain: ${domainError.message}`);
  }

  if (!domain) {
    return null;
  }

  let commitments: CommitmentRow[] = [];
  if (overrides?.lastCommitmentAt !== undefined) {
    commitments = overrides.lastCommitmentAt
      ? [
          {
            created_at: overrides.lastCommitmentAt.toISOString(),
            text: overrides.lastCommitmentText ?? "",
          },
        ]
      : [];
  } else {
    const { data: commitmentRows, error: commitmentsError } = await supabase
      .schema("axis")
      .from("commitments")
      .select("created_at, text")
      .eq("domain_id", domainId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (commitmentsError) {
      throw new Error(
        `Failed to load drift warning commitments: ${commitmentsError.message}`,
      );
    }

    commitments = (commitmentRows ?? []) as CommitmentRow[];
  }

  const recipientEmail = await getEmailForWarningRecipient(
    domain.user_id,
    overrides?.recipientEmail ?? recipientEmailHint,
  );

  return {
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    status: overrides?.status ?? domain.status,
    userId: domain.user_id,
    driftMode: domain.drift_mode ?? DEFAULT_DOMAIN_SETTINGS.driftMode,
    driftThresholdHours:
      domain.drift_threshold_hours ??
      DEFAULT_DOMAIN_SETTINGS.driftThresholdHours,
    warningLeadHours: domain.warning_lead_hours,
    commitmentRequirement:
      domain.commitment_requirement ??
      DEFAULT_DOMAIN_SETTINGS.commitmentRequirement,
    lastPassiveAlignmentAt:
      overrides?.lastPassiveAlignmentAt ?? toDate(domain.last_passive_alignment_at),
    lastDriftWarningSentAt: toDate(domain.last_drift_warning_sent_at),
    lastDriftWarningActivityAt: toDate(domain.last_drift_warning_activity_at),
    recipientEmail,
    commitments: commitments.map((commitment) => ({
      createdAt: new Date(commitment.created_at),
      text: commitment.text,
    })),
  };
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
  const warningLeadHours = getEffectiveWarningLeadHours({
    driftMode: domain.driftMode,
    driftThresholdHours: domain.driftThresholdHours,
    warningLeadHours: domain.warningLeadHours,
  });
  const driftDisabled = driftThresholdHours === null;
  const warningEligible =
    !driftDisabled &&
    warningLeadHours !== null &&
    domain.status !== "ARCHIVED" &&
    domain.status !== "DRIFTING" &&
    !driftState.autoDrifted &&
    domain.userId !== DEMO_USER_ID;
  const warningLeadMs =
    warningLeadHours === null ? null : warningLeadHours * 60 * 60 * 1000;

  const warningAt =
    warningEligible && driftState.nextDriftAt && warningLeadMs !== null
      ? new Date(driftState.nextDriftAt.getTime() - warningLeadMs)
      : null;

  return {
    driftState,
    driftThresholdHours,
    warningLeadHours,
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
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return process.env.NODE_ENV === "production"
    ? "https://axis.yuvrajkashyap.com"
    : "http://localhost:3000";
}

function buildDomainUrl(slug: string) {
  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) return null;
  return new URL(`/domain/${slug}`, appBaseUrl).toString();
}

async function sendDriftWarningEmail(
  domain: DomainWarningContext,
  warningLeadHours: number,
) {
  console.info("Drift warning email send started", {
    domainId: domain.id,
    userId: domain.userId,
    recipientEmail: domain.recipientEmail,
    warningLeadHours,
  });

  if (!resendClient) return { sent: false, reason: "resend-not-configured" as const };
  if (!process.env.RESEND_FROM_EMAIL) {
    return { sent: false, reason: "resend-from-missing" as const };
  }
  if (!domain.recipientEmail) {
    return { sent: false, reason: "recipient-email-missing" as const };
  }

  const latestCommitmentText = domain.commitments[0]?.text?.trim() || null;
  const domainUrl = buildDomainUrl(domain.slug);
  const warningLeadLabel = formatDriftThresholdLabel(warningLeadHours);
  const latestCommitmentHtml = latestCommitmentText
    ? `<p style="margin:20px 0 0;color:#71717a;font-size:13px;line-height:1.6;"><strong style="color:#e4e4e7;">Latest commitment:</strong> ${escapeHtml(latestCommitmentText)}</p>`
    : "";
  const latestCommitmentTextBlock = latestCommitmentText
    ? `\n\nLatest commitment: ${latestCommitmentText}`
    : "";

  const { error } = await resendClient.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: [domain.recipientEmail],
    subject: `Axis: ${domain.name} drifts in ${warningLeadLabel}`,
    html: `
      <div style="background:#09090b;color:#f4f4f5;padding:32px;font-family:Inter,Helvetica,Arial,sans-serif;">
        <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#71717a;">Axis</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;font-weight:600;">${escapeHtml(domain.name)} drifts in ${escapeHtml(warningLeadLabel)}.</h1>
        <p style="margin:0;color:#d4d4d8;font-size:15px;line-height:1.7;">Recommit or let it drift.</p>
        ${latestCommitmentHtml}
        ${
          domainUrl
            ? `<p style="margin:28px 0 0;"><a href="${domainUrl}" style="display:inline-block;border:1px solid rgba(255,255,255,0.14);padding:12px 18px;color:#f4f4f5;text-decoration:none;letter-spacing:0.18em;text-transform:uppercase;font-size:11px;">Open ${escapeHtml(domain.name)}</a></p>`
            : ""
        }
      </div>
    `,
    text: `Axis\n\n${domain.name} drifts in ${warningLeadLabel}.\nRecommit or let it drift.${latestCommitmentTextBlock}${domainUrl ? `\n\nOpen: ${domainUrl}` : ""}`,
  });

  if (error) {
    console.error("Drift warning email send failed", {
      domainId: domain.id,
      userId: domain.userId,
      recipientEmail: domain.recipientEmail,
      error: serializeError(error),
    });
    throw new Error(error.message);
  }

  console.info("Drift warning email send succeeded", {
    domainId: domain.id,
    userId: domain.userId,
    recipientEmail: domain.recipientEmail,
    warningLeadHours,
  });

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

async function processResolvedDomainDriftWarning(
  domain: DomainWarningContext,
  payload: DriftWarningPayload,
  warning: ReturnType<typeof buildWarningPayload>,
  options: { bypassTimingTolerance?: boolean } = {},
) {
  const nowMs = Date.now();
  const currentActivityAt = warning.driftState.lastRelevantActivityAt;

  if (
    !warning.warningEligible ||
    !warning.warningAt ||
    warning.warningLeadHours === null ||
    !currentActivityAt
  ) {
    console.info("Drift warning callback skipped", {
      domainId: payload.domainId,
      reason: "not-eligible",
    });
    return { sent: false, reason: "not-eligible" as const };
  }

  if (currentActivityAt.toISOString() !== payload.expectedActivityAt) {
    console.info("Drift warning callback skipped", {
      domainId: payload.domainId,
      reason: "stale-activity",
      currentActivityAt: currentActivityAt.toISOString(),
      expectedActivityAt: payload.expectedActivityAt,
    });
    return { sent: false, reason: "stale-activity" as const };
  }

  if (warning.warningAt.toISOString() !== payload.expectedWarningAt) {
    console.info("Drift warning callback skipped", {
      domainId: payload.domainId,
      reason: "stale-warning-window",
      currentWarningAt: warning.warningAt.toISOString(),
      expectedWarningAt: payload.expectedWarningAt,
    });
    return { sent: false, reason: "stale-warning-window" as const };
  }

  if (
    domain.lastDriftWarningActivityAt?.toISOString() === currentActivityAt.toISOString()
  ) {
    console.info("Drift warning callback skipped", {
      domainId: payload.domainId,
      reason: "already-sent",
      currentActivityAt: currentActivityAt.toISOString(),
    });
    return { sent: false, reason: "already-sent" as const };
  }

  if (
    !options.bypassTimingTolerance &&
    Math.abs(nowMs - warning.warningAt.getTime()) > DRIFT_WARNING_TOLERANCE_MS
  ) {
    console.info("Drift warning callback skipped", {
      domainId: payload.domainId,
      reason: "outside-warning-window",
      now: new Date(nowMs).toISOString(),
      warningAt: warning.warningAt.toISOString(),
    });
    return { sent: false, reason: "outside-warning-window" as const };
  }

  if (
    !options.bypassTimingTolerance &&
    warning.remainingMs !== null &&
    warning.remainingMs <= 0
  ) {
    console.info("Drift warning callback skipped", {
      domainId: payload.domainId,
      reason: "already-drifted",
      remainingMs: warning.remainingMs,
    });
    return { sent: false, reason: "already-drifted" as const };
  }

  const sendResult = await sendDriftWarningEmail(
    domain,
    warning.warningLeadHours,
  );
  if (!sendResult.sent) {
    return sendResult;
  }

  const supabase = await createWarningDataClient();
  const { error: updateError } = await supabase
    .schema("axis")
    .from("domains")
    .update({
      last_drift_warning_sent_at: new Date(nowMs).toISOString(),
      last_drift_warning_activity_at: currentActivityAt.toISOString(),
    })
    .eq("id", domain.id)
    .eq("user_id", domain.userId);

  if (updateError) {
    throw new Error(
      `Failed to persist drift warning metadata: ${updateError.message}`,
    );
  }

  console.info("Drift warning callback completed with send", {
    domainId: domain.id,
    userId: domain.userId,
    warningActivityAt: currentActivityAt.toISOString(),
  });

  return { sent: true as const };
}

export async function processDomainDriftWarning(
  payload: DriftWarningPayload,
  options: { bypassTimingTolerance?: boolean } = {},
) {
  console.info("Drift warning callback validation started", {
    domainId: payload.domainId,
    expectedWarningAt: payload.expectedWarningAt,
    expectedActivityAt: payload.expectedActivityAt,
    bypassTimingTolerance: options.bypassTimingTolerance ?? false,
  });

  const domain = await getDomainWarningContext(
    payload.domainId,
    payload.recipientEmail ?? null,
  );
  if (!domain) {
    return { sent: false, reason: "domain-not-found" as const };
  }

  const nowMs = Date.now();
  const warning = buildWarningPayload(domain, nowMs);
  const currentActivityAt = warning.driftState.lastRelevantActivityAt;

  console.info("Drift warning callback state resolved", {
    domainId: domain.id,
    userId: domain.userId,
    status: domain.status,
    driftMode: domain.driftMode,
    driftThresholdHours: warning.driftThresholdHours,
    warningLeadHours: warning.warningLeadHours,
    lastCommitmentAt: toIso(domain.commitments[0]?.createdAt ?? null),
    lastPassiveAlignmentAt: toIso(domain.lastPassiveAlignmentAt),
    lastRelevantActivityAt: toIso(currentActivityAt),
    driftAt: toIso(warning.driftState.nextDriftAt),
    warnAt: toIso(warning.warningAt),
    warningEligible: warning.warningEligible,
  });

  return processResolvedDomainDriftWarning(domain, payload, warning, options);
}

export async function scheduleDomainDriftWarning(
  domainId: string,
  overrides?: WarningScheduleOverrides,
) {
  console.info("Drift warning scheduling started", {
    domainId,
    source: overrides?.source ?? "unknown",
    overrideStatus: overrides?.status ?? null,
    overrideLastCommitmentAt: toIso(overrides?.lastCommitmentAt),
    overrideLastPassiveAlignmentAt: toIso(overrides?.lastPassiveAlignmentAt),
  });

  const domain = await getDomainWarningContext(
    domainId,
    overrides?.recipientEmail ?? null,
    overrides,
  );
  if (!domain) {
    console.warn("Drift warning scheduling skipped", {
      domainId,
      source: overrides?.source ?? "unknown",
      reason: "domain-not-found",
    });
    return { scheduled: false, reason: "domain-not-found" as const };
  }

  const warning = buildWarningPayload(domain);
  const currentActivityAt = warning.driftState.lastRelevantActivityAt;

  console.info("Drift warning settings resolved", {
    domainId: domain.id,
    source: overrides?.source ?? "unknown",
    userId: domain.userId,
    status: domain.status,
    driftMode: domain.driftMode,
    driftThresholdHours: warning.driftThresholdHours,
    warningLeadHours: warning.warningLeadHours,
    lastCommitmentAt: toIso(domain.commitments[0]?.createdAt ?? null),
    lastPassiveAlignmentAt: toIso(domain.lastPassiveAlignmentAt),
    driftAt: toIso(warning.driftState.nextDriftAt),
    warnAt: toIso(warning.warningAt),
    lastRelevantActivityAt: toIso(currentActivityAt),
    warningEligible: warning.warningEligible,
    driftDisabled: warning.driftDisabled,
  });

  if (
    !warning.warningEligible ||
    !warning.warningAt ||
    warning.warningLeadHours === null ||
    !currentActivityAt
  ) {
    console.warn("Drift warning scheduling skipped", {
      domainId: domain.id,
      source: overrides?.source ?? "unknown",
      reason: "not-eligible",
      driftMode: domain.driftMode,
      driftThresholdHours: warning.driftThresholdHours,
      warningLeadHours: warning.warningLeadHours,
      status: domain.status,
      lastRelevantActivityAt: toIso(currentActivityAt),
      driftAt: toIso(warning.driftState.nextDriftAt),
      warnAt: toIso(warning.warningAt),
    });
    return { scheduled: false, reason: "not-eligible" as const };
  }

  if (
    domain.lastDriftWarningActivityAt?.toISOString() === currentActivityAt.toISOString()
  ) {
    console.warn("Drift warning scheduling skipped", {
      domainId: domain.id,
      source: overrides?.source ?? "unknown",
      reason: "already-warned",
      lastDriftWarningActivityAt: domain.lastDriftWarningActivityAt.toISOString(),
      currentActivityAt: currentActivityAt.toISOString(),
    });
    return { scheduled: false, reason: "already-warned" as const };
  }

  const nowMs = Date.now();
  const payload: DriftWarningPayload = {
    domainId: domain.id,
    expectedWarningAt: warning.warningAt.toISOString(),
    expectedActivityAt: currentActivityAt.toISOString(),
    ...(domain.recipientEmail ? { recipientEmail: domain.recipientEmail } : {}),
  };

  if (warning.warningAt.getTime() <= nowMs) {
    console.info("Drift warning scheduling chose immediate processing", {
      domainId: domain.id,
      source: overrides?.source ?? "unknown",
      now: new Date(nowMs).toISOString(),
      driftAt: toIso(warning.driftState.nextDriftAt),
      warnAt: warning.warningAt.toISOString(),
      expectedActivityAt: currentActivityAt.toISOString(),
    });
    const result = await processResolvedDomainDriftWarning(domain, payload, warning, {
      bypassTimingTolerance: true,
    });
    return {
      scheduled: false,
      reason: result.sent ? ("processed-now" as const) : result.reason,
    };
  }

  if (!qstashClient) {
    console.warn("Drift warning scheduling skipped", {
      domainId: domain.id,
      source: overrides?.source ?? "unknown",
      reason: "qstash-not-configured",
    });
    return { scheduled: false, reason: "qstash-not-configured" as const };
  }

  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) {
    console.warn("Drift warning scheduling skipped", {
      domainId: domain.id,
      source: overrides?.source ?? "unknown",
      reason: "app-base-url-missing",
    });
    return { scheduled: false, reason: "app-base-url-missing" as const };
  }

  const delaySeconds = Math.max(
    1,
    Math.ceil((warning.warningAt.getTime() - nowMs) / 1000),
  );

  const callbackUrl = `${appBaseUrl}/api/qstash/drift-warning`;

  console.info("Drift warning QStash publish started", {
    domainId: domain.id,
    source: overrides?.source ?? "unknown",
    callbackUrl,
    delaySeconds,
    driftAt: toIso(warning.driftState.nextDriftAt),
    warnAt: warning.warningAt.toISOString(),
    expectedActivityAt: currentActivityAt.toISOString(),
  });

  try {
    const publishResult = await qstashClient.publishJSON({
      url: callbackUrl,
      body: payload,
      headers: {
        "Content-Type": "application/json",
      },
      delay: delaySeconds,
      retries: 3,
    });

    console.info("Drift warning QStash publish succeeded", {
      domainId: domain.id,
      source: overrides?.source ?? "unknown",
      messageId: publishResult.messageId,
      callbackUrl: publishResult.url,
      deduplicated: publishResult.deduplicated ?? false,
      delaySeconds,
      driftAt: toIso(warning.driftState.nextDriftAt),
      warnAt: warning.warningAt.toISOString(),
      expectedActivityAt: currentActivityAt.toISOString(),
    });
  } catch (error) {
    console.error("Drift warning QStash publish failed", {
      domainId: domain.id,
      source: overrides?.source ?? "unknown",
      callbackUrl,
      delaySeconds,
      error: serializeError(error),
    });
    throw error;
  }

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
