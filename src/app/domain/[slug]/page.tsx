import { isAdmin } from "@/lib/get-data";
import { normalizeDomainSettings } from "@/lib/domain-settings";
import { restoreLegacyIfNeededForCurrentUser } from "@/lib/restore-legacy";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import { notFound, redirect } from "next/navigation";
import { DomainView } from "./DomainView";

type DomainPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ align?: string; idx?: string; demoUser?: string }>;
};

async function getDomainDetail(userId: string, slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data: domain, error: domainError } = await supabase
    .schema("axis")
    .from("domains")
    .select(
      "id,name,slug,status,color,identity,vision,primary_reason,primary_cost,current_reality,drift_mode,drift_threshold_hours,commitment_requirement,orbit_speed,visual_intensity,planet_size_scale,orbit_eccentricity",
    )
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (domainError) {
    throw new Error(`Failed to load domain: ${domainError.message}`);
  }

  if (!domain) {
    return null;
  }

  const { data: commitments, error: commitmentsError } = await supabase
    .schema("axis")
    .from("commitments")
    .select("id,text,created_at")
    .eq("domain_id", domain.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (commitmentsError) {
    throw new Error(
      `Failed to load domain commitments: ${commitmentsError.message}`,
    );
  }

  return {
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    status: domain.status,
    color: domain.color,
    identity: domain.identity,
    vision: domain.vision,
    primaryReason: domain.primary_reason,
    primaryCost: domain.primary_cost,
    currentReality: domain.current_reality,
    driftMode: domain.drift_mode,
    driftThresholdHours: domain.drift_threshold_hours,
    commitmentRequirement: domain.commitment_requirement,
    orbitSpeed: domain.orbit_speed,
    visualIntensity: domain.visual_intensity,
    planetSizeScale: domain.planet_size_scale,
    orbitEccentricity: domain.orbit_eccentricity,
    commitments: (commitments ?? []).map((commitment) => ({
      id: commitment.id,
      text: commitment.text,
      createdAt: new Date(commitment.created_at),
    })),
  };
}

type DomainDetail = NonNullable<Awaited<ReturnType<typeof getDomainDetail>>>;
type DomainCommitment = DomainDetail["commitments"][number];

export default async function DomainDetailPage({ params, searchParams }: DomainPageProps) {
  const user = await requireSupabaseUser();

  const { slug } = await params;
  const { align, idx, demoUser } = await searchParams;

  // If demoUser param is set, admin is editing the demo orrery
  let targetUserId = user.id;
  if (demoUser) {
    const admin = await isAdmin(user.email);
    if (!admin) redirect("/");
    targetUserId = demoUser;
  } else {
    await restoreLegacyIfNeededForCurrentUser();
  }

  const domain = await getDomainDetail(targetUserId, slug);

  if (!domain) notFound();

  // Parse align chain if present
  const alignSlugs = align ? align.split(",") : null;
  const alignIdx = idx ? parseInt(idx, 10) : 0;

  return (
    <DomainView
      domain={domain}
      settings={normalizeDomainSettings({
        driftMode: domain.driftMode,
        driftThresholdHours: domain.driftThresholdHours,
        commitmentRequirement: domain.commitmentRequirement,
        orbitSpeed: domain.orbitSpeed,
        visualIntensity: domain.visualIntensity,
        planetSizeScale: domain.planetSizeScale,
        orbitEccentricity: domain.orbitEccentricity,
      })}
      commitments={domain.commitments.map((commitment: DomainCommitment) => ({
        ...commitment,
        createdAt: commitment.createdAt.toISOString(),
      }))}
      alignChain={alignSlugs}
      alignIdx={alignIdx}
      demoUser={demoUser}
    />
  );
}
