"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrCreateDemoUserId, isAdmin } from "@/lib/get-data";
import { revalidatePath } from "next/cache";

type OrbitUpdate = {
  id: string;
  radius: number;
};

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

export async function updateOrbit(
  domainId: string,
  normalizedRadius: number,
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  await prisma.domain.updateMany({
    where: { id: domainId, userId },
    data: { positionX: normalizedRadius },
  });
}

export async function resetOrbits(
  updates: OrbitUpdate[],
  targetUserId?: string,
) {
  if (updates.length === 0) {
    return;
  }

  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  await Promise.all(
    updates.map((update: OrbitUpdate) =>
      prisma.domain.updateMany({
        where: { id: update.id, userId },
        data: { positionX: update.radius },
      }),
    ),
  );
  revalidatePath("/");
}

export async function createDomain(name: string, overrideUserId?: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthorizedTargetUserId(overrideUserId);
  if (!userId) return { success: false, error: "Not signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Name is required." };

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!slug) return { success: false, error: "Invalid name." };

  const existing = await prisma.domain.findFirst({
    where: { userId, slug },
  });
  if (existing) return { success: false, error: "A domain with that name already exists." };

  await prisma.domain.create({
    data: {
      name: trimmed,
      slug,
      userId,
    },
  });

  revalidatePath("/");
  return { success: true };
}
