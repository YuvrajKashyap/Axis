import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const domains = await prisma.domain.findMany({
    orderBy: { createdAt: "asc" },
    select: { name: true, slug: true, status: true, color: true, identity: true, vision: true, primaryReason: true, primaryCost: true, positionX: true },
  });

  return NextResponse.json(domains);
}