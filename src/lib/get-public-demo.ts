import type { DomainData } from "@/app/Orrery";
import { normalizeDomainSettings } from "@/lib/domain-settings";
import { computeDriftState } from "@/lib/drift";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type PublicDemoRow = {
  id: string;
  name: string;
  slug: string;
  status: "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED";
  identity: string | null;
  next_move: string | null;
  primary_reason: string | null;
  position_x: number | null;
  color: string | null;
  drift_mode: "PRESET" | "CUSTOM" | "NEVER" | null;
  drift_threshold_hours: number | null;
  commitment_requirement: "STANDARD" | "PASSIVE_ALIGNMENT" | null;
  orbit_speed: "STILL" | "SLOW" | "STANDARD" | "FAST" | null;
  visual_intensity: "SUBTLE" | "BALANCED" | "INTENSE" | null;
  planet_size_scale: number | null;
  orbit_eccentricity:
    | "DEFAULT"
    | "SLIGHTLY_ELLIPTICAL"
    | "VERY_ELLIPTICAL"
    | null;
  last_passive_alignment_at: string | null;
  last_commitment_at: string | null;
  last_commitment_text: string | null;
};

function isPublicDemoRow(value: unknown): value is PublicDemoRow {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function getPublicDemoOrrery(): Promise<DomainData[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .rpc("get_public_demo_orrery");

  if (error) {
    throw new Error(`Failed to load public demo orrery: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error("Public demo RPC returned an invalid payload.");
  }

  return data
    .filter(isPublicDemoRow)
    .map((domain) => {
      const settings = normalizeDomainSettings({
        driftMode: domain.drift_mode ?? undefined,
        driftThresholdHours: domain.drift_threshold_hours ?? undefined,
        commitmentRequirement: domain.commitment_requirement ?? undefined,
        orbitSpeed: domain.orbit_speed ?? undefined,
        visualIntensity: domain.visual_intensity ?? undefined,
        planetSizeScale: domain.planet_size_scale ?? undefined,
        orbitEccentricity: domain.orbit_eccentricity ?? undefined,
      });
      const lastCommitmentAt = domain.last_commitment_at
        ? new Date(domain.last_commitment_at)
        : null;
      const lastPassiveAlignmentAt = domain.last_passive_alignment_at
        ? new Date(domain.last_passive_alignment_at)
        : null;
      const driftState = computeDriftState({
        status: domain.status,
        driftMode: settings.driftMode,
        driftThresholdHours: settings.driftThresholdHours,
        commitmentRequirement: settings.commitmentRequirement,
        lastCommitmentAt,
        lastPassiveAlignmentAt,
        disableAutoDrift: true,
      });

      return {
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        status: driftState.effectiveStatus as DomainData["status"],
        identity: domain.identity,
        nextMove: domain.next_move,
        primaryReason: domain.primary_reason,
        positionX: domain.position_x ?? 0,
        color: domain.color,
        autoDrifted: driftState.autoDrifted,
        lastCommitmentAt: lastCommitmentAt?.toISOString() ?? null,
        lastRelevantActivityAt:
          driftState.lastRelevantActivityAt?.toISOString() ?? null,
        settings,
      } satisfies DomainData;
    });
}
