import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domains = await prisma.domain.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { name: true, slug: true, status: true, color: true, identity: true, vision: true, primaryReason: true, primaryCost: true, positionX: true },
  });

  return NextResponse.json(domains);
}
