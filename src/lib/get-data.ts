import { DEFAULT_DOMAIN_SETTINGS } from "@/lib/domain-settings";
import { computeDriftState } from "@/lib/drift";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
export const DEMO_USER_ID = process.env.DEMO_USER_ID || "";

type GetDomainsOptions = {
  disableAutoDrift?: boolean;
};

type SupabaseDomainRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  identity: string | null;
  primary_reason: string | null;
  primary_cost: string | null;
  next_move: string | null;
  vision: string | null;
  current_reality: string | null;
  standard: string | null;
  proof: string | null;
  color: string | null;
  status: "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED";
  drift_mode:
    | "PRESET"
    | "CUSTOM"
    | "NEVER"
    | null;
  drift_threshold_hours: number | null;
  commitment_requirement:
    | "STANDARD"
    | "PASSIVE_ALIGNMENT"
    | null;
  orbit_speed:
    | "STILL"
    | "SLOW"
    | "STANDARD"
    | "FAST"
    | null;
  visual_intensity:
    | "SUBTLE"
    | "BALANCED"
    | "INTENSE"
    | null;
  planet_size_scale: number | null;
  orbit_eccentricity:
    | "DEFAULT"
    | "SLIGHTLY_ELLIPTICAL"
    | "VERY_ELLIPTICAL"
    | null;
  last_passive_alignment_at: string | null;
  last_drift_warning_sent_at: string | null;
  last_drift_warning_activity_at: string | null;
  position_x: number | null;
  position_y: number | null;
  position_z: number | null;
  created_at: string;
  updated_at: string;
};

type SupabaseCommitmentRow = {
  domain_id: string;
  created_at: string;
  text: string;
};

type LatestCommitment = {
  createdAt: Date;
  text: string;
};

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function mapDomainRow(
  row: SupabaseDomainRow,
  latestCommitment: LatestCommitment | null,
) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    identity: row.identity,
    primaryReason: row.primary_reason,
    primaryCost: row.primary_cost,
    nextMove: row.next_move,
    vision: row.vision,
    currentReality: row.current_reality,
    standard: row.standard,
    proof: row.proof,
    color: row.color,
    status: row.status,
    driftMode: row.drift_mode ?? DEFAULT_DOMAIN_SETTINGS.driftMode,
    driftThresholdHours:
      row.drift_threshold_hours ?? DEFAULT_DOMAIN_SETTINGS.driftThresholdHours,
    commitmentRequirement:
      row.commitment_requirement ??
      DEFAULT_DOMAIN_SETTINGS.commitmentRequirement,
    orbitSpeed: row.orbit_speed ?? DEFAULT_DOMAIN_SETTINGS.orbitSpeed,
    visualIntensity:
      row.visual_intensity ?? DEFAULT_DOMAIN_SETTINGS.visualIntensity,
    planetSizeScale:
      row.planet_size_scale ?? DEFAULT_DOMAIN_SETTINGS.planetSizeScale,
    orbitEccentricity:
      row.orbit_eccentricity ?? DEFAULT_DOMAIN_SETTINGS.orbitEccentricity,
    lastPassiveAlignmentAt: toDate(row.last_passive_alignment_at),
    lastDriftWarningSentAt: toDate(row.last_drift_warning_sent_at),
    lastDriftWarningActivityAt: toDate(row.last_drift_warning_activity_at),
    positionX: row.position_x ?? 0,
    positionY: row.position_y ?? 0,
    positionZ: row.position_z ?? 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    commitments: latestCommitment ? [latestCommitment] : [],
  };
}

export async function getDomains(
  userId: string,
  options: GetDomainsOptions = {},
) {
  const { disableAutoDrift = false } = options;
  const supabase = await createSupabaseServerClient();

  const { data: domainRows, error: domainsError } = await supabase
    .schema("axis")
    .from("domains")
    .select(
      "id,user_id,name,slug,description,identity,primary_reason,primary_cost,next_move,vision,current_reality,standard,proof,color,status,drift_mode,drift_threshold_hours,commitment_requirement,orbit_speed,visual_intensity,planet_size_scale,orbit_eccentricity,last_passive_alignment_at,last_drift_warning_sent_at,last_drift_warning_activity_at,position_x,position_y,position_z,created_at,updated_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (domainsError) {
    throw new Error(`Failed to load domains: ${domainsError.message}`);
  }

  const domainIds = (domainRows ?? []).map((row: SupabaseDomainRow) => row.id);
  const latestCommitmentsByDomainId = new Map<string, LatestCommitment>();

  if (domainIds.length > 0) {
    const { data: commitmentRows, error: commitmentsError } = await supabase
      .schema("axis")
      .from("commitments")
      .select("domain_id,created_at,text")
      .in("domain_id", domainIds)
      .order("created_at", { ascending: false });

    if (commitmentsError) {
      throw new Error(
        `Failed to load latest commitments: ${commitmentsError.message}`,
      );
    }

    for (const row of (commitmentRows ?? []) as SupabaseCommitmentRow[]) {
      if (latestCommitmentsByDomainId.has(row.domain_id)) {
        continue;
      }

      latestCommitmentsByDomainId.set(row.domain_id, {
        createdAt: new Date(row.created_at),
        text: row.text,
      });
    }
  }

  const domains = (domainRows ?? []).map((row: SupabaseDomainRow) =>
    mapDomainRow(row, latestCommitmentsByDomainId.get(row.id) ?? null),
  );

  return domains.map((domain: (typeof domains)[number]) => {
    const lastCommitmentAt = domain.commitments[0]?.createdAt ?? null;
    const driftState = computeDriftState({
      status: domain.status,
      driftMode: domain.driftMode,
      driftThresholdHours: domain.driftThresholdHours,
      commitmentRequirement: domain.commitmentRequirement,
      lastCommitmentAt,
      lastPassiveAlignmentAt: domain.lastPassiveAlignmentAt,
      disableAutoDrift,
    });

    return {
      ...domain,
      effectiveStatus: driftState.effectiveStatus as
        | "ALIGNED"
        | "NEUTRAL"
        | "DRIFTING"
        | "ARCHIVED",
      lastCommitmentAt,
      lastRelevantActivityAt: driftState.lastRelevantActivityAt,
      nextDriftAt: driftState.nextDriftAt,
      effectiveDriftThresholdHours: driftState.driftThresholdHours,
      autoDrifted: driftState.autoDrifted,
    };
  });
}

export type DomainList = Awaited<ReturnType<typeof getDomains>>;
export type DomainListItem = DomainList[number];
export type DomainListStatus = DomainListItem["status"];

export async function getOrCreateDemoUserId(): Promise<string | null> {
  return DEMO_USER_ID || null;
}

export async function getDemoDomains() {
  const demoUserId = await getOrCreateDemoUserId();
  if (!demoUserId) return null;
  return getDomains(demoUserId, { disableAutoDrift: true });
}

export async function isAdmin(
  email: string | null | undefined,
): Promise<boolean> {
  return !!email && !!ADMIN_EMAIL && email === ADMIN_EMAIL;
}
