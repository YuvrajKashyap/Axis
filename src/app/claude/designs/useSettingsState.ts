"use client";

import { useState, useMemo } from "react";
import {
  DEFAULT_DOMAIN_SETTINGS,
  DRIFT_PRESET_HOURS,
  normalizeDomainSettings,
  formatDriftThresholdLabel,
  getVisualIntensityMultiplier,
  getOrbitEccentricityRatio,
  type DomainCommitmentRequirementValue,
  type DomainOrbitSpeedValue,
  type DomainVisualIntensityValue,
  type DomainOrbitEccentricityValue,
  type DomainSettingsSnapshot,
  type DomainDriftModeValue,
} from "@/lib/domain-settings";

export type DriftSelectValue =
  | "24h"
  | "48h"
  | "72h"
  | "96h"
  | "7d"
  | "never"
  | "custom";

const DEFAULT_DRIFT_THRESHOLD_HOURS = 72;

function driftSelectFromSettings(
  settings: DomainSettingsSnapshot,
): DriftSelectValue {
  if (settings.driftMode === "NEVER") return "never";
  if (
    settings.driftMode === "PRESET" &&
    DRIFT_PRESET_HOURS.includes(
      settings.driftThresholdHours as (typeof DRIFT_PRESET_HOURS)[number],
    )
  ) {
    if (settings.driftThresholdHours === 168) return "7d";
    return `${settings.driftThresholdHours}h` as DriftSelectValue;
  }
  return "custom";
}

export function useSettingsState() {
  const initialSettings = useMemo(
    () => normalizeDomainSettings(DEFAULT_DOMAIN_SETTINGS),
    [],
  );

  const [driftSelect, setDriftSelect] = useState<DriftSelectValue>(
    driftSelectFromSettings(initialSettings),
  );
  const [customUnit, setCustomUnit] = useState<"hours" | "days">("hours");
  const [customValue, setCustomValue] = useState(72);
  const [commitmentRequirement, setCommitmentRequirement] =
    useState<DomainCommitmentRequirementValue>(initialSettings.commitmentRequirement);
  const [orbitSpeed, setOrbitSpeed] = useState<DomainOrbitSpeedValue>(
    initialSettings.orbitSpeed,
  );
  const [orbitEccentricity, setOrbitEccentricity] =
    useState<DomainOrbitEccentricityValue>(initialSettings.orbitEccentricity);
  const [visualIntensity, setVisualIntensity] =
    useState<DomainVisualIntensityValue>(initialSettings.visualIntensity);
  const [planetSizeScale, setPlanetSizeScale] = useState(
    initialSettings.planetSizeScale,
  );

  const effectiveCustomHours =
    customUnit === "days"
      ? Math.min(7, customValue) * 24
      : Math.min(168, customValue);

  const draftSettings = useMemo<DomainSettingsSnapshot>(() => {
    const driftMode: DomainDriftModeValue =
      driftSelect === "never"
        ? "NEVER"
        : driftSelect === "custom"
          ? "CUSTOM"
          : "PRESET";

    const driftThresholdHours =
      driftSelect === "custom"
        ? effectiveCustomHours
        : driftSelect === "never"
          ? DEFAULT_DRIFT_THRESHOLD_HOURS
          : driftSelect === "7d"
            ? 168
            : Number.parseInt(driftSelect, 10);

    return normalizeDomainSettings({
      driftMode,
      driftThresholdHours,
      commitmentRequirement,
      orbitSpeed,
      orbitEccentricity,
      visualIntensity,
      planetSizeScale,
    });
  }, [
    commitmentRequirement,
    driftSelect,
    effectiveCustomHours,
    orbitEccentricity,
    orbitSpeed,
    planetSizeScale,
    visualIntensity,
  ]);

  const driftLabel =
    driftSelect === "never"
      ? "drift disabled"
      : formatDriftThresholdLabel(
          driftSelect === "custom"
            ? effectiveCustomHours
            : driftSelect === "7d"
              ? 168
              : Number.parseInt(driftSelect, 10),
        );

  const previewGlow = getVisualIntensityMultiplier(visualIntensity);
  const previewOrbitScaleY = getOrbitEccentricityRatio(orbitEccentricity);

  return {
    driftSelect,
    setDriftSelect,
    customUnit,
    setCustomUnit,
    customValue,
    setCustomValue,
    commitmentRequirement,
    setCommitmentRequirement,
    orbitSpeed,
    setOrbitSpeed,
    orbitEccentricity,
    setOrbitEccentricity,
    visualIntensity,
    setVisualIntensity,
    planetSizeScale,
    setPlanetSizeScale,
    effectiveCustomHours,
    draftSettings,
    driftLabel,
    previewGlow,
    previewOrbitScaleY,
  };
}
