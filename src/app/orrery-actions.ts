"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function updateOrbit(domainId: string, normalizedRadius: number) {
  await prisma.domain.update({
    where: { id: domainId },
    data: { positionX: normalizedRadius },
  });
}

export async function resetOrbits(
  updates: { id: string; radius: number }[],
) {
  await Promise.all(
    updates.map((u) =>
      prisma.domain.update({
        where: { id: u.id },
        data: { positionX: u.radius },
      }),
    ),
  );
  revalidatePath("/");
}

export async function createDomain(name: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getUser();
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
