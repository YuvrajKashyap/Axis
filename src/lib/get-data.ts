import { prisma } from "@/lib/prisma";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

const DRIFT_THRESHOLD_MS = 72 * 60 * 60 * 1000; // 72 hours

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

export async function getDemoDomainsFromAdmin() {
  if (!ADMIN_EMAIL) return null;

  const admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  if (!admin) return null;
  return getDomains(admin.id);
}
