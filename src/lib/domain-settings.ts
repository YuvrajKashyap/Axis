export const DEFAULT_DRIFT_THRESHOLD_HOURS = 72;
export const DRIFT_WARNING_LEAD_HOURS = 12;
export const MAX_DRIFT_THRESHOLD_HOURS = 7 * 24;

export const DRIFT_PRESET_HOURS = [24, 48, 72, 96, 168] as const;

export const DRIFT_MODE_VALUES = ["PRESET", "CUSTOM", "NEVER"] as const;
export type DomainDriftModeValue = (typeof DRIFT_MODE_VALUES)[number];

export const COMMITMENT_REQUIREMENT_VALUES = [
  "STANDARD",
  "PASSIVE_ALIGNMENT",
] as const;
export type DomainCommitmentRequirementValue =
  (typeof COMMITMENT_REQUIREMENT_VALUES)[number];

export const ORBIT_SPEED_VALUES = [
  "STILL",
  "SLOW",
  "STANDARD",
  "FAST",
] as const;
export type DomainOrbitSpeedValue = (typeof ORBIT_SPEED_VALUES)[number];

export const VISUAL_INTENSITY_VALUES = [
  "SUBTLE",
  "BALANCED",
  "INTENSE",
] as const;
export type DomainVisualIntensityValue =
  (typeof VISUAL_INTENSITY_VALUES)[number];

export const ORBIT_ECCENTRICITY_VALUES = [
  "DEFAULT",
  "SLIGHTLY_ELLIPTICAL",
  "VERY_ELLIPTICAL",
] as const;
export type DomainOrbitEccentricityValue =
  (typeof ORBIT_ECCENTRICITY_VALUES)[number];

export const PLANET_SIZE_SCALE_MIN = 0.3;
export const PLANET_SIZE_SCALE_MAX = 1.7;
export const PLANET_SIZE_SCALE_DEFAULT = 1;

export type DomainSettingsSnapshot = {
  driftMode: DomainDriftModeValue;
  driftThresholdHours: number;
  commitmentRequirement: DomainCommitmentRequirementValue;
  orbitSpeed: DomainOrbitSpeedValue;
  visualIntensity: DomainVisualIntensityValue;
  planetSizeScale: number;
  orbitEccentricity: DomainOrbitEccentricityValue;
};

export const DEFAULT_DOMAIN_SETTINGS: DomainSettingsSnapshot = {
  driftMode: "PRESET",
  driftThresholdHours: DEFAULT_DRIFT_THRESHOLD_HOURS,
  commitmentRequirement: "STANDARD",
  orbitSpeed: "STANDARD",
  visualIntensity: "BALANCED",
  planetSizeScale: PLANET_SIZE_SCALE_DEFAULT,
  orbitEccentricity: "DEFAULT",
};

export function clampDriftThresholdHours(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DRIFT_THRESHOLD_HOURS;
  return Math.min(
    MAX_DRIFT_THRESHOLD_HOURS,
    Math.max(1, Math.round(value)),
  );
}

export function clampPlanetSizeScale(value: number): number {
  if (!Number.isFinite(value)) return PLANET_SIZE_SCALE_DEFAULT;
  return Math.min(PLANET_SIZE_SCALE_MAX, Math.max(PLANET_SIZE_SCALE_MIN, value));
}

export function getEffectiveDriftThresholdHours(
  settings: Pick<DomainSettingsSnapshot, "driftMode" | "driftThresholdHours">,
): number | null {
  if (settings.driftMode === "NEVER") return null;
  return clampDriftThresholdHours(settings.driftThresholdHours);
}

export function getEffectiveDriftThresholdMs(
  settings: Pick<DomainSettingsSnapshot, "driftMode" | "driftThresholdHours">,
): number | null {
  const hours = getEffectiveDriftThresholdHours(settings);
  return hours === null ? null : hours * 60 * 60 * 1000;
}

export function formatDriftThresholdLabel(hours: number | null): string {
  if (hours === null) return "Never";
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function getOrbitSpeedMultiplier(speed: DomainOrbitSpeedValue): number {
  switch (speed) {
    case "STILL":
      return 0;
    case "SLOW":
      return 0.5;
    case "FAST":
      return 3;
    case "STANDARD":
    default:
      return 1;
  }
}

export function getVisualIntensityMultiplier(
  intensity: DomainVisualIntensityValue,
): number {
  switch (intensity) {
    case "SUBTLE":
      return 0.72;
    case "INTENSE":
      return 1.38;
    case "BALANCED":
    default:
      return 1;
  }
}

export function getOrbitEccentricityRatio(
  eccentricity: DomainOrbitEccentricityValue,
): number {
  switch (eccentricity) {
    case "SLIGHTLY_ELLIPTICAL":
      return 0.68;
    case "VERY_ELLIPTICAL":
      return 0.32;
    case "DEFAULT":
    default:
      return 1;
  }
}

export function normalizeDomainSettings(
  partial: Partial<DomainSettingsSnapshot> | null | undefined,
): DomainSettingsSnapshot {
  return {
    driftMode:
      partial?.driftMode && DRIFT_MODE_VALUES.includes(partial.driftMode)
        ? partial.driftMode
        : DEFAULT_DOMAIN_SETTINGS.driftMode,
    driftThresholdHours: clampDriftThresholdHours(
      partial?.driftThresholdHours ?? DEFAULT_DOMAIN_SETTINGS.driftThresholdHours,
    ),
    commitmentRequirement:
      partial?.commitmentRequirement &&
      COMMITMENT_REQUIREMENT_VALUES.includes(partial.commitmentRequirement)
        ? partial.commitmentRequirement
        : DEFAULT_DOMAIN_SETTINGS.commitmentRequirement,
    orbitSpeed:
      partial?.orbitSpeed && ORBIT_SPEED_VALUES.includes(partial.orbitSpeed)
        ? partial.orbitSpeed
        : DEFAULT_DOMAIN_SETTINGS.orbitSpeed,
    visualIntensity:
      partial?.visualIntensity &&
      VISUAL_INTENSITY_VALUES.includes(partial.visualIntensity)
        ? partial.visualIntensity
        : DEFAULT_DOMAIN_SETTINGS.visualIntensity,
    planetSizeScale: clampPlanetSizeScale(
      partial?.planetSizeScale ?? DEFAULT_DOMAIN_SETTINGS.planetSizeScale,
    ),
    orbitEccentricity:
      partial?.orbitEccentricity &&
      ORBIT_ECCENTRICITY_VALUES.includes(partial.orbitEccentricity)
        ? partial.orbitEccentricity
        : DEFAULT_DOMAIN_SETTINGS.orbitEccentricity,
  };
}
