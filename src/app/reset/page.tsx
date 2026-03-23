import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResetFlow } from "./ResetFlow";

export default async function ResetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains = await prisma.domain.findMany({
    where: { userId: session.user.id, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      identity: true,
      nextMove: true,
      color: true,
    },
  });

  return <ResetFlow domains={domains} />;
}
