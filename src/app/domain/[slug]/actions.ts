'use server';

import { scheduleDomainDriftWarning } from "@/lib/drift-warning";
import { prisma } from "@/lib/prisma";
import { getAuthorizedTargetUserId } from "@/lib/target-user";
import { revalidatePath } from "next/cache";

type CreateCommitmentResult =
  | { success: true }
  | { success: false; error: string };

type CommitmentRecord = {
  id: string;
  text: string;
  createdAt: string;
};

async function scheduleDomainDriftWarningSafely(domainId: string) {
  try {
    await scheduleDomainDriftWarning(domainId);
  } catch (error) {
    console.error("Failed to schedule drift warning after domain mutation", {
      domainId,
      error,
    });
  }
}

export async function updateDomainStatus(
  domainId: string,
  status: "ALIGNED" | "DRIFTING" | "ARCHIVED",
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  await prisma.domain.updateMany({
    where: { id: domainId, userId },
    data: { status },
  });

  await scheduleDomainDriftWarningSafely(domainId);
  revalidatePath("/");
}

export async function updateDomainColor(
  domainId: string,
  color: string,
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  await prisma.domain.updateMany({
    where: { id: domainId, userId },
    data: { color },
  });
  revalidatePath("/");
}

export async function createCommitment(
  domainId: string,
  text: string,
  targetUserId?: string,
): Promise<CreateCommitmentResult> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return {
      success: false,
      error: "Commitment text is required.",
    };
  }

  try {
    const userId = await getAuthorizedTargetUserId(targetUserId);
    if (!userId) {
      return { success: false, error: "Not signed in." };
    }

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, userId },
      select: { id: true },
    });

    if (!domain) {
      return { success: false, error: "Domain not found." };
    }

    await prisma.commitment.create({
      data: {
        domainId: domain.id,
        text: trimmedText,
        userId,
      },
    });

    await scheduleDomainDriftWarningSafely(domain.id);
    revalidatePath("/");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to create commitment.",
    };
  }
}

export async function recordPassiveAlignmentTouch(
  domainId: string,
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return { success: false };
  }

  const domain = await prisma.domain.findFirst({
    where: { id: domainId, userId },
    select: {
      id: true,
      commitmentRequirement: true,
    },
  });

  if (!domain || domain.commitmentRequirement !== "PASSIVE_ALIGNMENT") {
    return { success: false };
  }

  await prisma.domain.updateMany({
    where: { id: domain.id, userId },
    data: {
      lastPassiveAlignmentAt: new Date(),
    },
  });

  await scheduleDomainDriftWarningSafely(domain.id);
  revalidatePath("/");
  return { success: true };
}

export async function loadAllCommitments(
  domainId: string,
  targetUserId?: string,
): Promise<CommitmentRecord[]> {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return [];
  }

  const commitments = await prisma.commitment.findMany({
    where: { domainId, userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      text: true,
      createdAt: true,
    },
  });

  return commitments.map((commitment) => ({
    ...commitment,
    createdAt: commitment.createdAt.toISOString(),
  }));
}

export async function clearCommitments(domainId: string, targetUserId?: string) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  await prisma.commitment.deleteMany({
    where: { domainId, userId },
  });
  revalidatePath("/");
}

export async function deleteDomain(domainId: string, targetUserId?: string) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  await prisma.commitment.deleteMany({ where: { domainId, userId } });
  await prisma.domain.deleteMany({ where: { id: domainId, userId } });
  revalidatePath("/");
}

export async function updateDomainName(
  domainId: string,
  name: string,
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  const trimmed = name.trim();
  if (!userId || !trimmed) return;

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!slug) return;

  const existing = await prisma.domain.findFirst({
    where: {
      userId,
      slug,
      NOT: { id: domainId },
    },
    select: { id: true },
  });

  if (existing) return;

  await prisma.domain.updateMany({
    where: { id: domainId, userId },
    data: { name: trimmed, slug },
  });
  revalidatePath("/");
}

export async function updateDomainFields(
  domainId: string,
  fields: {
    identity?: string;
    vision?: string;
    primaryReason?: string;
    primaryCost?: string;
  },
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  await prisma.domain.updateMany({
    where: { id: domainId, userId },
    data: fields,
  });
  revalidatePath("/");
}
