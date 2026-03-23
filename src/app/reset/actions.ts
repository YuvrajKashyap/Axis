"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitResetCommitments(
  entries: { domainId: string; text: string }[],
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const sanitizedEntries = entries
    .map((entry) => ({
      domainId: entry.domainId,
      text: entry.text.trim(),
    }))
    .filter((entry) => entry.text);

  if (sanitizedEntries.length === 0) {
    return;
  }

  const allowedDomains = await prisma.domain.findMany({
    where: {
      userId,
      id: { in: sanitizedEntries.map((entry) => entry.domainId) },
    },
    select: { id: true },
  });

  const allowedDomainIds = new Set(allowedDomains.map((domain) => domain.id));
  const writableEntries = sanitizedEntries.filter((entry) =>
    allowedDomainIds.has(entry.domainId),
  );

  if (writableEntries.length === 0) {
    return;
  }

  await Promise.all(
    writableEntries.map((e) =>
      prisma.commitment.create({
        data: {
          domainId: e.domainId,
          text: e.text,
          userId,
        },
      }),
    ),
  );

  revalidatePath("/", "layout");
}
