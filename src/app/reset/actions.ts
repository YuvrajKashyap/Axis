"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type ResetCommitmentEntry = {
  domainId: string;
  text: string;
};

type AllowedDomainRecord = {
  id: string;
};

export async function submitResetCommitments(
  entries: ResetCommitmentEntry[],
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const sanitizedEntries: ResetCommitmentEntry[] = entries
    .map((entry: ResetCommitmentEntry) => ({
      domainId: entry.domainId,
      text: entry.text.trim(),
    }))
    .filter((entry: ResetCommitmentEntry) => entry.text.length > 0);

  if (sanitizedEntries.length === 0) {
    return;
  }

  const allowedDomains: AllowedDomainRecord[] = await prisma.domain.findMany({
    where: {
      userId,
      id: {
        in: sanitizedEntries.map(
          (entry: ResetCommitmentEntry) => entry.domainId,
        ),
      },
    },
    select: { id: true },
  });

  const allowedDomainIds = new Set(
    allowedDomains.map((domain: AllowedDomainRecord) => domain.id),
  );
  const writableEntries = sanitizedEntries.filter((entry: ResetCommitmentEntry) =>
    allowedDomainIds.has(entry.domainId),
  );

  if (writableEntries.length === 0) {
    return;
  }

  await Promise.all(
    writableEntries.map((entry: ResetCommitmentEntry) =>
      prisma.commitment.create({
        data: {
          domainId: entry.domainId,
          text: entry.text,
          userId,
        },
      }),
    ),
  );

  revalidatePath("/", "layout");
}
