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

  await Promise.all(
    entries.map((e) =>
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
