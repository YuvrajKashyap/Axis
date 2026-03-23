'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type CreateCommitmentResult =
  | { success: true }
  | { success: false; error: string };

export async function updateDomainStatus(
  domainId: string,
  status: "ALIGNED" | "DRIFTING" | "ARCHIVED",
) {
  await prisma.domain.update({
    where: { id: domainId },
    data: { status },
  });
  revalidatePath("/");
}

export async function updateDomainColor(
  domainId: string,
  color: string,
) {
  await prisma.domain.update({
    where: { id: domainId },
    data: { color },
  });
  revalidatePath("/");
}

export async function createCommitment(
  domainId: string,
  text: string,
): Promise<CreateCommitmentResult> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return {
      success: false,
      error: "Commitment text is required.",
    };
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not signed in." };
    }

    await prisma.commitment.create({
      data: {
        domainId,
        text: trimmedText,
        userId: session.user.id,
      },
    });

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Failed to create commitment.",
    };
  }
}

export async function clearCommitments(domainId: string) {
  await prisma.commitment.deleteMany({
    where: { domainId },
  });
  revalidatePath("/");
}

export async function deleteDomain(domainId: string) {
  await prisma.commitment.deleteMany({ where: { domainId } });
  await prisma.domain.delete({ where: { id: domainId } });
  revalidatePath("/");
}

export async function updateDomainName(domainId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  await prisma.domain.update({
    where: { id: domainId },
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
) {
  await prisma.domain.update({
    where: { id: domainId },
    data: fields,
  });
  revalidatePath("/");
}
