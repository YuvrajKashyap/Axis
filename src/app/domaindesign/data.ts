import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getSampleDomain() {
  const supabase = await createSupabaseServerClient();
  const { data: domains, error: domainError } = await supabase
    .schema("axis")
    .from("domains")
    .select(
      "id,user_id,name,slug,description,identity,primary_reason,primary_cost,next_move,vision,current_reality,standard,proof,color,status,drift_mode,drift_threshold_hours,warning_lead_hours,commitment_requirement,orbit_speed,visual_intensity,planet_size_scale,orbit_eccentricity,last_passive_alignment_at,last_drift_warning_sent_at,last_drift_warning_activity_at,position_x,position_y,position_z,created_at,updated_at",
    )
    .neq("status", "ARCHIVED")
    .order("created_at", { ascending: true })
    .limit(1);

  if (domainError) {
    throw new Error(`Failed to load sample domain: ${domainError.message}`);
  }

  const domain = domains?.[0];
  if (!domain) {
    return null;
  }

  const { data: commitments, error: commitmentsError } = await supabase
    .schema("axis")
    .from("commitments")
    .select("id,domain_id,user_id,text,completed,created_at,updated_at")
    .eq("domain_id", domain.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (commitmentsError) {
    throw new Error(
      `Failed to load sample domain commitments: ${commitmentsError.message}`,
    );
  }

  return {
    id: domain.id,
    userId: domain.user_id,
    name: domain.name,
    slug: domain.slug,
    description: domain.description,
    identity: domain.identity,
    primaryReason: domain.primary_reason,
    primaryCost: domain.primary_cost,
    nextMove: domain.next_move,
    vision: domain.vision,
    currentReality: domain.current_reality,
    standard: domain.standard,
    proof: domain.proof,
    color: domain.color,
    status: domain.status,
    driftMode: domain.drift_mode,
    driftThresholdHours: domain.drift_threshold_hours,
    warningLeadHours: domain.warning_lead_hours,
    commitmentRequirement: domain.commitment_requirement,
    orbitSpeed: domain.orbit_speed,
    visualIntensity: domain.visual_intensity,
    planetSizeScale: domain.planet_size_scale,
    orbitEccentricity: domain.orbit_eccentricity,
    lastPassiveAlignmentAt: domain.last_passive_alignment_at
      ? new Date(domain.last_passive_alignment_at)
      : null,
    lastDriftWarningSentAt: domain.last_drift_warning_sent_at
      ? new Date(domain.last_drift_warning_sent_at)
      : null,
    lastDriftWarningActivityAt: domain.last_drift_warning_activity_at
      ? new Date(domain.last_drift_warning_activity_at)
      : null,
    positionX: domain.position_x,
    positionY: domain.position_y,
    positionZ: domain.position_z,
    createdAt: new Date(domain.created_at),
    updatedAt: new Date(domain.updated_at),
    commitments: (commitments ?? []).map((commitment) => ({
      id: commitment.id,
      domainId: commitment.domain_id,
      userId: commitment.user_id,
      text: commitment.text,
      completed: commitment.completed,
      createdAt: new Date(commitment.created_at),
      updatedAt: new Date(commitment.updated_at),
    })),
  };
}

export type SampleDomain = NonNullable<Awaited<ReturnType<typeof getSampleDomain>>>;
