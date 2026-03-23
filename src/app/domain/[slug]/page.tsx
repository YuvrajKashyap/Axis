import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { DomainView } from "./DomainView";

type DomainPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ align?: string; idx?: string }>;
};

export default async function DomainDetailPage({ params, searchParams }: DomainPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;
  const { align, idx } = await searchParams;

  const domain = await prisma.domain.findUnique({
    where: { userId_slug: { userId: session.user.id, slug } },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      color: true,
      identity: true,
      vision: true,
      primaryReason: true,
      primaryCost: true,
      currentReality: true,
      commitments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          text: true,
          createdAt: true,
        },
      },
    },
  });

  if (!domain) notFound();

  // Parse align chain if present
  const alignSlugs = align ? align.split(",") : null;
  const alignIdx = idx ? parseInt(idx, 10) : 0;

  return (
    <DomainView
      domain={domain}
      commitments={domain.commitments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))}
      alignChain={alignSlugs}
      alignIdx={alignIdx}
    />
  );
}
