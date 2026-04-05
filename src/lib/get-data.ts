import { computeDriftState } from "@/lib/drift";
import { prisma } from "@/lib/prisma";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
export const DEMO_EMAIL = "demo@axis.internal";

const DEMO_PASSWORD_HASH =
  "$2b$10$PUMSZkfC5bjw9oxLoFxgtO0gBVyAm.8RNbhBMesDW7qsHMQxZrMb6";

type GetDomainsOptions = {
  disableAutoDrift?: boolean;
};

export async function getDomains(
  userId: string,
  options: GetDomainsOptions = {},
) {
  const { disableAutoDrift = false } = options;
  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      commitments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, text: true },
      },
    },
  });

  return domains.map((domain: (typeof domains)[number]) => {
    const lastCommitmentAt = domain.commitments[0]?.createdAt ?? null;
    const driftState = computeDriftState({
      status: domain.status,
      driftMode: domain.driftMode,
      driftThresholdHours: domain.driftThresholdHours,
      commitmentRequirement: domain.commitmentRequirement,
      lastCommitmentAt,
      lastPassiveAlignmentAt: domain.lastPassiveAlignmentAt,
      disableAutoDrift,
    });

    return {
      ...domain,
      effectiveStatus: driftState.effectiveStatus as
        | "ALIGNED"
        | "NEUTRAL"
        | "DRIFTING"
        | "ARCHIVED",
      lastCommitmentAt,
      lastRelevantActivityAt: driftState.lastRelevantActivityAt,
      nextDriftAt: driftState.nextDriftAt,
      effectiveDriftThresholdHours: driftState.driftThresholdHours,
      autoDrifted: driftState.autoDrifted,
    };
  });
}

export type DomainList = Awaited<ReturnType<typeof getDomains>>;
export type DomainListItem = DomainList[number];
export type DomainListStatus = DomainListItem["status"];

export async function getOrCreateDemoUserId(): Promise<string | null> {
  let demo = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });

  if (!demo) {
    demo = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo",
        password: DEMO_PASSWORD_HASH,
      },
      select: { id: true },
    });
  }

  return demo.id;
}

export async function getDemoDomains() {
  const demoUserId = await getOrCreateDemoUserId();
  if (!demoUserId) return null;
  return getDomains(demoUserId, { disableAutoDrift: true });
}

export async function isAdmin(
  email: string | null | undefined,
): Promise<boolean> {
  return !!email && !!ADMIN_EMAIL && email === ADMIN_EMAIL;
}
