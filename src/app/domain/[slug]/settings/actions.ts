'use server';

import {
  clampDriftThresholdHours,
  clampPlanetSizeScale,
  DEFAULT_DRIFT_THRESHOLD_HOURS,
  DRIFT_PRESET_HOURS,
  normalizeDomainSettings,
  type DomainCommitmentRequirementValue,
  type DomainDriftModeValue,
  type DomainOrbitEccentricityValue,
  type DomainOrbitSpeedValue,
  type DomainVisualIntensityValue,
} from "@/lib/domain-settings";
import { scheduleDomainDriftWarning } from "@/lib/drift-warning";
import { prisma } from "@/lib/prisma";
import { getAuthorizedTargetUserId } from "@/lib/target-user";
import { revalidatePath } from "next/cache";

type SaveDomainSettingsInput = {
  driftMode: DomainDriftModeValue;
  driftThresholdHours: number;
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

  const domain = await prisma.domain.findFirst({
    where: { id: domainId, userId },
    select: {
      id: true,
      slug: true,
    },
  });

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

  await prisma.domain.update({
    where: { id: domain.id },
    data: {
      driftMode: normalized.driftMode,
      driftThresholdHours,
      commitmentRequirement: normalized.commitmentRequirement,
      orbitSpeed: normalized.orbitSpeed,
      visualIntensity: normalized.visualIntensity,
      planetSizeScale: clampPlanetSizeScale(normalized.planetSizeScale),
      orbitEccentricity: normalized.orbitEccentricity,
    },
  });

  await scheduleDomainDriftWarning(domain.id);

  revalidatePath("/");
  revalidatePath(`/domain/${domain.slug}`);
  revalidatePath(`/domain/${domain.slug}/settings`);

  return { success: true as const };
}
