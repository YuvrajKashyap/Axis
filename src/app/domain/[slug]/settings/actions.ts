'use server';

import {
  clampDriftThresholdHours,
  clampWarningLeadHours,
  clampPlanetSizeScale,
  DEFAULT_DRIFT_THRESHOLD_HOURS,
  DRIFT_PRESET_HOURS,
  normalizeDomainSettings,
  validateWarningLeadHours,
  type DomainCommitmentRequirementValue,
  type DomainDriftModeValue,
  type DomainOrbitEccentricityValue,
  type DomainOrbitSpeedValue,
  type DomainVisualIntensityValue,
} from "@/lib/domain-settings";
import { scheduleDomainDriftWarning } from "@/lib/drift-warning";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAuthorizedTargetUserId } from "@/lib/target-user";
import { revalidatePath } from "next/cache";

type SaveDomainSettingsInput = {
  driftMode: DomainDriftModeValue;
  driftThresholdHours: number;
  warningLeadHours: number | null;
  commitmentRequirement: DomainCommitmentRequirementValue;
  orbitSpeed: DomainOrbitSpeedValue;
  visualIntensity: DomainVisualIntensityValue;
  planetSizeScale: number;
  orbitEccentricity: DomainOrbitEccentricityValue;
};

export async function saveDomainSettings(
  domainId: string,
  input: SaveDomainSettingsInput,
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return { success: false as const, error: "Not signed in." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: domain, error: domainError } = await supabase
    .schema("axis")
    .from("domains")
    .select("id, slug")
    .eq("id", domainId)
    .eq("user_id", userId)
    .maybeSingle();

  if (domainError) {
    return { success: false as const, error: "Failed to load domain." };
  }

  if (!domain) {
    return { success: false as const, error: "Domain not found." };
  }

  const normalized = normalizeDomainSettings(input);

  const driftThresholdHours =
    normalized.driftMode === "PRESET"
      ? DRIFT_PRESET_HOURS.includes(normalized.driftThresholdHours as (typeof DRIFT_PRESET_HOURS)[number])
        ? normalized.driftThresholdHours
        : DEFAULT_DRIFT_THRESHOLD_HOURS
      : clampDriftThresholdHours(normalized.driftThresholdHours);
  const warningLeadHours =
    normalized.driftMode === "NEVER" || normalized.warningLeadHours === null
      ? null
      : clampWarningLeadHours(normalized.warningLeadHours);
  const warningValidationError = validateWarningLeadHours({
    driftMode: normalized.driftMode,
    driftThresholdHours,
    warningLeadHours,
  });

  if (warningValidationError) {
    return { success: false as const, error: warningValidationError };
  }

  const { error: updateError } = await supabase
    .schema("axis")
    .from("domains")
    .update({
      drift_mode: normalized.driftMode,
      drift_threshold_hours: driftThresholdHours,
      warning_lead_hours: warningLeadHours,
      commitment_requirement: normalized.commitmentRequirement,
      orbit_speed: normalized.orbitSpeed,
      visual_intensity: normalized.visualIntensity,
      planet_size_scale: clampPlanetSizeScale(normalized.planetSizeScale),
      orbit_eccentricity: normalized.orbitEccentricity,
    })
    .eq("id", domain.id)
    .eq("user_id", userId);

  if (updateError) {
    return { success: false as const, error: updateError.message };
  }

  try {
    const result = await scheduleDomainDriftWarning(domain.id);
    if (!result.scheduled) {
      console.warn("Drift warning was not scheduled after settings save", {
        domainId: domain.id,
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error("Failed to schedule drift warning after settings save", {
      domainId: domain.id,
      error,
    });
  }

  revalidatePath("/");
  revalidatePath(`/domain/${domain.slug}`);
  revalidatePath(`/domain/${domain.slug}/settings`);

  return { success: true as const };
}
