import { prisma } from "@/lib/prisma";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

const DRIFT_THRESHOLD_MS = 72 * 60 * 60 * 1000; // 72 hours
const DEMO_PASSWORD_HASH =
  "$2b$10$PUMSZkfC5bjw9oxLoFxgtO0gBVyAm.8RNbhBMesDW7qsHMQxZrMb6";

export async function getDomains(userId: string) {
  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      commitments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  return domains.map((d) => {
    const lastCommitmentAt = d.commitments[0]?.createdAt ?? null;
    const isStale =
      !lastCommitmentAt ||
      Date.now() - lastCommitmentAt.getTime() > DRIFT_THRESHOLD_MS;

    // ARCHIVED takes precedence — never auto-drift archived domains
    // Only auto-drift if user's explicit status is active (ALIGNED/NEUTRAL)
    const autoDrifted =
      d.status !== "DRIFTING" &&
      d.status !== "ARCHIVED" &&
      isStale;

    const effectiveStatus = autoDrifted ? "DRIFTING" : d.status;

    return {
      ...d,
      effectiveStatus: effectiveStatus as "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED",
      lastCommitmentAt,
      autoDrifted,
    };
  });
}

export type DomainList = Awaited<ReturnType<typeof getDomains>>;
export type DomainListItem = DomainList[number];
export type DomainListStatus = DomainListItem["status"];

const DEMO_EMAIL = "demo@axis.internal";

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
  return getDomains(demoUserId);
}

export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  return !!email && !!ADMIN_EMAIL && email === ADMIN_EMAIL;
}
