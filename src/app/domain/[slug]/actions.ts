'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrCreateDemoUserId, isAdmin } from "@/lib/get-data";
import { revalidatePath } from "next/cache";

type CreateCommitmentResult =
  | { success: true }
  | { success: false; error: string };

async function getAuthorizedTargetUserId(targetUserId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const sessionUserId = session.user.id;

  if (!targetUserId || targetUserId === sessionUserId) {
    return sessionUserId;
  }

  const admin = await isAdmin(session.user.email);
  if (!admin) {
    return null;
  }

  const demoUserId = await getOrCreateDemoUserId();
  if (!demoUserId || targetUserId !== demoUserId) {
    return null;
  }

  return demoUserId;
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

    revalidatePath("/");
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to create commitment.",
    };
  }
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

export async function updateDomainName(domainId: string, name: string, targetUserId?: string) {
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
