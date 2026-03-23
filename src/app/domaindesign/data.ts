import { prisma } from "@/lib/prisma";

export async function getSampleDomain() {
  const domain = await prisma.domain.findFirst({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
    include: {
      commitments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  return domain;
}

export type SampleDomain = NonNullable<Awaited<ReturnType<typeof getSampleDomain>>>;
