import { normalizeDomainSettings } from "@/lib/domain-settings";
import { isAdmin } from "@/lib/get-data";
import { restoreLegacyIfNeededForCurrentUser } from "@/lib/restore-legacy";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import { notFound, redirect } from "next/navigation";
import { DomainSettingsView } from "./DomainSettingsView";

type DomainSettingsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ align?: string; idx?: string; demoUser?: string }>;
};

async function getDomainSettingsDetail(userId: string, slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("domains")
    .select(
      "id,name,slug,color,position_x,drift_mode,drift_threshold_hours,commitment_requirement,orbit_speed,visual_intensity,planet_size_scale,orbit_eccentricity",
    )
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load domain settings: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    color: data.color,
    positionX: data.position_x,
    driftMode: data.drift_mode,
    driftThresholdHours: data.drift_threshold_hours,
    commitmentRequirement: data.commitment_requirement,
    orbitSpeed: data.orbit_speed,
    visualIntensity: data.visual_intensity,
    planetSizeScale: data.planet_size_scale,
    orbitEccentricity: data.orbit_eccentricity,
  };
}

export default async function DomainSettingsPage({
  params,
  searchParams,
}: DomainSettingsPageProps) {
  const user = await requireSupabaseUser();

  const { slug } = await params;
  const { align, idx, demoUser } = await searchParams;

  let targetUserId = user.id;
  if (demoUser) {
    const admin = await isAdmin(user.email);
    if (!admin) redirect("/");
    targetUserId = demoUser;
  } else {
    await restoreLegacyIfNeededForCurrentUser();
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
