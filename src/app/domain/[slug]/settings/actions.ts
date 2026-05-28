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
  type DomainSubtaskResetModeValue,
  type DomainSubtaskSnapshot,
  type DomainVisualIntensityValue,
} from "@/lib/domain-settings";
import { scheduleDomainDriftWarning } from "@/lib/drift-warning";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAuthorizedTargetUserId } from "@/lib/target-user";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

type SaveDomainSettingsInput = {
  driftMode: DomainDriftModeValue;
  driftThresholdHours: number;
  warningLeadHours: number | null;
  commitmentRequirement: DomainCommitmentRequirementValue;
  subtaskResetMode: DomainSubtaskResetModeValue;
  subtaskTimeZone: string;
  subtasks: DomainSubtaskSnapshot[];
  orbitSpeed: DomainOrbitSpeedValue;
  visualIntensity: DomainVisualIntensityValue;
  planetSizeScale: number;
  orbitEccentricity: DomainOrbitEccentricityValue;
};

function ensureSubtasksForRequirement(input: SaveDomainSettingsInput) {
  const normalized = normalizeDomainSettings(input);

  if (
    normalized.commitmentRequirement !== "SUBTASKS" ||
    normalized.subtasks.length > 0
  ) {
    return normalized;
  }

  return {
    ...normalized,
    subtasks: [{ id: randomUUID(), label: "Task Name", sortOrder: 0 }],
  };
}

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

  const normalized = ensureSubtasksForRequirement(input);

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
      subtask_reset_mode: normalized.subtaskResetMode,
      subtask_time_zone: normalized.subtaskTimeZone,
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

  const { data: existingSubtasks, error: existingSubtasksError } = await supabase
    .schema("axis")
    .from("domain_subtasks")
    .select("id")
    .eq("domain_id", domain.id)
    .eq("user_id", userId);

  if (existingSubtasksError) {
    return { success: false as const, error: existingSubtasksError.message };
  }

  const existingSubtaskIds = new Set(
    (existingSubtasks ?? []).map((subtask) => subtask.id),
  );
  const nextSubtaskIds = new Set(
    normalized.subtasks.map((subtask) => subtask.id),
  );
  const deletedSubtaskIds = Array.from(existingSubtaskIds).filter(
    (id) => !nextSubtaskIds.has(id),
  );

  if (deletedSubtaskIds.length > 0) {
    const { error: deleteSubtasksError } = await supabase
      .schema("axis")
      .from("domain_subtasks")
      .delete()
      .eq("domain_id", domain.id)
      .eq("user_id", userId)
      .in("id", deletedSubtaskIds);

    if (deleteSubtasksError) {
      return { success: false as const, error: deleteSubtasksError.message };
    }
  }

  const updateSubtasks = normalized.subtasks.filter((subtask) =>
    existingSubtaskIds.has(subtask.id),
  );
  const insertSubtasks = normalized.subtasks.filter(
    (subtask) => !existingSubtaskIds.has(subtask.id),
  );

  for (const subtask of updateSubtasks) {
    const { error: updateSubtaskError } = await supabase
      .schema("axis")
      .from("domain_subtasks")
      .update({
        label: subtask.label,
        sort_order: subtask.sortOrder,
      })
      .eq("id", subtask.id)
      .eq("domain_id", domain.id)
      .eq("user_id", userId);

    if (updateSubtaskError) {
      return { success: false as const, error: updateSubtaskError.message };
    }
  }

  if (insertSubtasks.length > 0) {
    const { error: insertSubtasksError } = await supabase
      .schema("axis")
      .from("domain_subtasks")
      .insert(
        insertSubtasks.map((subtask) => ({
          id: subtask.id,
          domain_id: domain.id,
          user_id: userId,
          label: subtask.label,
          sort_order: subtask.sortOrder,
        })),
      );

    if (insertSubtasksError) {
      return { success: false as const, error: insertSubtasksError.message };
    }
  }

  try {
    const result = await scheduleDomainDriftWarning(domain.id, {
      source: "settings-save",
    });
    if (result.reason === "processed-now") {
      console.info("Drift warning processed immediately after settings save", {
        domainId: domain.id,
        source: "settings-save",
      });
    } else if (!result.scheduled) {
      console.warn("Drift warning was not scheduled after settings save", {
        domainId: domain.id,
        source: "settings-save",
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error("Failed to schedule drift warning after settings save", {
      domainId: domain.id,
      source: "settings-save",
      error,
    });
  }

  revalidatePath("/");
  revalidatePath(`/domain/${domain.slug}`);
  revalidatePath(`/domain/${domain.slug}/settings`);

  return { success: true as const };
}
