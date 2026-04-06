import { auth } from "@/lib/auth";
import { normalizeDomainSettings } from "@/lib/domain-settings";
import { isAdmin } from "@/lib/get-data";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { DomainSettingsView } from "./DomainSettingsView";

type DomainSettingsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ align?: string; idx?: string; demoUser?: string }>;
};

async function getDomainSettingsDetail(userId: string, slug: string) {
  return prisma.domain.findUnique({
    where: { userId_slug: { userId, slug } },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      positionX: true,
      driftMode: true,
      driftThresholdHours: true,
      commitmentRequirement: true,
      orbitSpeed: true,
      visualIntensity: true,
      planetSizeScale: true,
      orbitEccentricity: true,
    },
  });
}

export default async function DomainSettingsPage({
  params,
  searchParams,
}: DomainSettingsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { slug } = await params;
  const { align, idx, demoUser } = await searchParams;

  let targetUserId = session.user.id;
  if (demoUser) {
    const admin = await isAdmin(session.user.email);
    if (!admin) redirect("/");
    targetUserId = demoUser;
  }

  const domain = await getDomainSettingsDetail(targetUserId, slug);
  if (!domain) notFound();

  const backParams = new URLSearchParams();
  if (demoUser) backParams.set("demoUser", demoUser);
  if (align) backParams.set("align", align);
  if (idx) backParams.set("idx", idx);
  const backHref = backParams.toString()
    ? `/domain/${domain.slug}?${backParams.toString()}`
    : `/domain/${domain.slug}`;
  const homeHref = demoUser ? "/?demo=edit" : "/";

  return (
    <DomainSettingsView
      domain={{
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        color: domain.color,
        positionX: domain.positionX,
      }}
      settings={normalizeDomainSettings({
        driftMode: domain.driftMode,
        driftThresholdHours: domain.driftThresholdHours,
        commitmentRequirement: domain.commitmentRequirement,
        orbitSpeed: domain.orbitSpeed,
        visualIntensity: domain.visualIntensity,
        planetSizeScale: domain.planetSizeScale,
        orbitEccentricity: domain.orbitEccentricity,
      })}
      backHref={backHref}
      homeHref={homeHref}
      targetUserId={demoUser}
    />
  );
}
