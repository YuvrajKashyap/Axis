"use client";

import {
  DEFAULT_WARNING_LEAD_HOURS,
  DEFAULT_DOMAIN_SETTINGS,
  DEFAULT_DRIFT_THRESHOLD_HOURS,
  DRIFT_PRESET_HOURS,
  WARNING_LEAD_PRESET_HOURS,
  formatDriftThresholdLabel,
  getOrbitEccentricityRatio,
  getVisualIntensityMultiplier,
  normalizeDomainSettings,
  validateWarningLeadHours,
  type DomainCommitmentRequirementValue,
  type DomainDriftModeValue,
  type DomainOrbitEccentricityValue,
  type DomainOrbitSpeedValue,
  type DomainSettingsSnapshot,
  type DomainVisualIntensityValue,
} from "@/lib/domain-settings";
import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { saveDomainSettings } from "./actions";
import "./settings.css";

type DomainSettingsViewProps = {
  domain: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    positionX: number;
  };
  settings: DomainSettingsSnapshot;
  backHref: string;
  homeHref: string;
  targetUserId?: string;
};

type DriftSelectValue =
  | "24h"
  | "48h"
  | "72h"
  | "96h"
  | "7d"
  | "never"
  | "custom";

type WarningLeadSelectValue =
  | "off"
  | "1h"
  | "3h"
  | "6h"
  | "12h"
  | "24h"
  | "custom";

type SettingsTabKey = "behavior" | "motion" | "visual";

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

function customUnitFromHours(hours: number) {
  return hours % 24 === 0 && hours / 24 <= 7 ? "days" : "hours";
}

function customValueFromHours(hours: number) {
  const unit = customUnitFromHours(hours);
  return unit === "days" ? Math.max(1, Math.round(hours / 24)) : hours;
}

function warningLeadSelectFromSettings(
  settings: DomainSettingsSnapshot,
): WarningLeadSelectValue {
  if (settings.warningLeadHours === null) return "off";
  if (
    WARNING_LEAD_PRESET_HOURS.includes(
      settings.warningLeadHours as (typeof WARNING_LEAD_PRESET_HOURS)[number],
    )
  ) {
    return `${settings.warningLeadHours}h` as WarningLeadSelectValue;
  }
  return "custom";
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return { r: 103, g: 232, b: 249 };
  }

  const value = Number.parseInt(expanded, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case red:
        h = (green - blue) / d + (green < blue ? 6 : 0);
        break;
      case green:
        h = (blue - red) / d + 2;
        break;
      default:
        h = (red - green) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hueToRgb(p: number, q: number, t: number) {
  let next = t;
  if (next < 0) next += 1;
  if (next > 1) next -= 1;
  if (next < 1 / 6) return p + (q - p) * 6 * next;
  if (next < 1 / 2) return q;
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number) {
  if (s === 0) {
    const value = Math.round(l * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${value}${value}${value}`;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);

  return `#${[r, g, b]
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function tuneHexColor(
  hex: string,
  saturationMultiplier: number,
  lightnessMultiplier: number,
  lightnessOffset: number = 0,
) {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  return hslToHex(
    hsl.h,
    Math.max(0, Math.min(1, hsl.s * saturationMultiplier)),
    Math.max(0, Math.min(1, hsl.l * lightnessMultiplier + lightnessOffset)),
  );
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

function buildPreviewPlanetVisual(hex: string, intensity: DomainVisualIntensityValue) {
  const intensityMultiplier = getVisualIntensityMultiplier(intensity);
  if (intensityMultiplier === 1) {
    return {
      color: hex,
      glow: `0 0 8px ${withAlpha(hex, 0.9)}, 0 0 22px ${withAlpha(hex, 0.5)}, 0 0 50px ${withAlpha(hex, 0.15)}`,
      ringColor: withAlpha(hex, 0.06),
    };
  }

  const isSubtle = intensityMultiplier < 1;
  const isIntense = intensityMultiplier > 1;
  const saturationMultiplier = isSubtle ? 0.88 : isIntense ? 2.25 : 1;
  const lightnessMultiplier = isSubtle ? 0.98 : isIntense ? 1.04 : 1;
  const lightnessOffset = isIntense ? 0.015 : 0;
  const tunedColor = tuneHexColor(
    hex,
    saturationMultiplier,
    lightnessMultiplier,
    lightnessOffset,
  );

  if (isIntense) {
    return {
      color: tunedColor,
      glow: `0 0 10px ${withAlpha(tunedColor, 1)}, 0 0 18px ${withAlpha(tunedColor, 0.98)}, 0 0 30px ${withAlpha(tunedColor, 0.76)}, 0 0 48px ${withAlpha(tunedColor, 0.26)}`,
      ringColor: withAlpha(hex, 0.06),
    };
  }

  return {
    color: tunedColor,
    glow: `0 0 6.56px ${withAlpha(tunedColor, 0.7)}, 0 0 18.04px ${withAlpha(tunedColor, 0.31)}, 0 0 41px ${withAlpha(tunedColor, 0.117)}`,
    ringColor: withAlpha(hex, 0.06),
  };
}

function getPreviewPlanetSize(normalizedRadius: number, sizeScale: number) {
  const sunCore = 18;
  const maxPlanet = Math.round(sunCore * 0.65);
  const maxPlanetScaleCap = sunCore * 0.7;
  const scaledBase = 7 + (1 - normalizedRadius / 0.92) * (maxPlanet - 7);
  return Math.min(maxPlanetScaleCap, scaledBase * sizeScale);
}

function Pill<T extends string>({
  value,
  current,
  label,
  onChange,
  accentColor,
  disabled = false,
}: {
  value: T;
  current: T;
  label: string;
  onChange: (value: T) => void;
  accentColor: string;
  disabled?: boolean;
}) {
  const active = current === value;

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(value);
      }}
      className={`rounded border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em] transition-all duration-200 ${
        active
          ? ""
          : disabled
            ? "cursor-not-allowed border-white/[0.03] bg-transparent text-zinc-800"
            : "border-white/[0.04] bg-transparent text-zinc-600 hover:border-white/10 hover:text-zinc-400"
      }`}
      style={
        active
          ? {
              borderColor: withAlpha(accentColor, 0.32),
              backgroundColor: withAlpha(accentColor, 0.08),
              color: accentColor,
              boxShadow: `inset 0 0 12px ${withAlpha(accentColor, 0.05)}`,
            }
          : disabled
            ? {
                opacity: 0.35,
              }
            : undefined
      }
    >
      {label}
    </button>
  );
}

function SettingRow({
  label,
  detail,
  children,
}: {
  label: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-white/[0.04] py-6 last:border-b-0">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[12px] font-medium tracking-wide text-zinc-200">
            {label}
          </h2>
          {detail ? (
            <p className="mt-1 max-w-md text-[11px] leading-relaxed text-zinc-600">
              {detail}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function DomainSettingsView({
  domain,
  settings,
  backHref,
  homeHref,
  targetUserId,
}: DomainSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("behavior");
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const initialSettings = useMemo(() => normalizeDomainSettings(settings), [settings]);
  const defaultSettings = useMemo(
    () => normalizeDomainSettings(DEFAULT_DOMAIN_SETTINGS),
    [],
  );

  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [autosaveRevision, setAutosaveRevision] = useState(0);
  const [driftSelect, setDriftSelect] = useState<DriftSelectValue>(
    driftSelectFromSettings(initialSettings),
  );
  const [customUnit, setCustomUnit] = useState<"hours" | "days">(
    customUnitFromHours(initialSettings.driftThresholdHours),
  );
  const [customValue, setCustomValue] = useState(
    customValueFromHours(initialSettings.driftThresholdHours),
  );
  const [warningLeadSelect, setWarningLeadSelect] =
    useState<WarningLeadSelectValue>(
      warningLeadSelectFromSettings(initialSettings),
    );
  const [warningCustomUnit, setWarningCustomUnit] = useState<"hours" | "days">(
    customUnitFromHours(
      initialSettings.warningLeadHours ?? DEFAULT_WARNING_LEAD_HOURS,
    ),
  );
  const [warningCustomValue, setWarningCustomValue] = useState(
    customValueFromHours(
      initialSettings.warningLeadHours ?? DEFAULT_WARNING_LEAD_HOURS,
    ),
  );
  const [commitmentRequirement, setCommitmentRequirement] =
    useState<DomainCommitmentRequirementValue>(
      initialSettings.commitmentRequirement,
    );
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

  const applySettings = (nextSettings: DomainSettingsSnapshot) => {
    setSaveState("idle");
    setSaveError("");
    setDriftSelect(driftSelectFromSettings(nextSettings));
    setCustomUnit(customUnitFromHours(nextSettings.driftThresholdHours));
    setCustomValue(customValueFromHours(nextSettings.driftThresholdHours));
    setWarningLeadSelect(warningLeadSelectFromSettings(nextSettings));
    setWarningCustomUnit(
      customUnitFromHours(
        nextSettings.warningLeadHours ?? DEFAULT_WARNING_LEAD_HOURS,
      ),
    );
    setWarningCustomValue(
      customValueFromHours(
        nextSettings.warningLeadHours ?? DEFAULT_WARNING_LEAD_HOURS,
      ),
    );
    setCommitmentRequirement(nextSettings.commitmentRequirement);
    setOrbitSpeed(nextSettings.orbitSpeed);
    setOrbitEccentricity(nextSettings.orbitEccentricity);
    setVisualIntensity(nextSettings.visualIntensity);
    setPlanetSizeScale(nextSettings.planetSizeScale);
  };

  const queueAutosave = () => {
    setSaveState("idle");
    setSaveError("");
    setAutosaveRevision((value) => value + 1);
  };

  const changeCustomUnit = (nextUnit: "hours" | "days") => {
    if (nextUnit === customUnit) return;

    setCustomUnit(nextUnit);
    setCustomValue((currentValue) =>
      nextUnit === "days"
        ? Math.max(1, Math.min(7, Math.round(currentValue / 24) || 1))
        : Math.max(1, Math.min(168, currentValue * 24)),
    );
    queueAutosave();
  };

  const changeWarningCustomUnit = (nextUnit: "hours" | "days") => {
    if (nextUnit === warningCustomUnit) return;

    setWarningCustomUnit(nextUnit);
    setWarningCustomValue((currentValue) =>
      nextUnit === "days"
        ? Math.max(1, Math.min(7, Math.round(currentValue / 24) || 1))
        : Math.max(1, Math.min(168, currentValue * 24)),
    );
    queueAutosave();
  };

  const color = domain.color ?? "#67e8f9";
  const accentColor = color;

  const effectiveCustomHours =
    customUnit === "days" ? Math.min(7, customValue) * 24 : Math.min(168, customValue);
  const effectiveWarningCustomHours =
    warningCustomUnit === "days"
      ? Math.min(7, warningCustomValue) * 24
      : Math.min(168, warningCustomValue);

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
    const warningLeadHours =
      driftMode === "NEVER"
        ? null
        : warningLeadSelect === "off"
          ? null
          : warningLeadSelect === "custom"
            ? effectiveWarningCustomHours
            : Number.parseInt(warningLeadSelect, 10);

    return normalizeDomainSettings({
      driftMode,
      driftThresholdHours,
      warningLeadHours,
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
    effectiveWarningCustomHours,
    orbitEccentricity,
    orbitSpeed,
    planetSizeScale,
    visualIntensity,
    warningLeadSelect,
  ]);

  const warningValidationError = useMemo(
    () => validateWarningLeadHours(draftSettings),
    [draftSettings],
  );
  const isWarningDisabled = draftSettings.driftMode === "NEVER";
  const maxWarningLeadHours = isWarningDisabled
    ? null
    : draftSettings.driftThresholdHours;
  const canUseWarningDays =
    maxWarningLeadHours !== null && maxWarningLeadHours >= 24;
  const warningCustomMaxHours = maxWarningLeadHours ?? 168;
  const warningCustomMaxDays = Math.max(
    1,
    Math.min(7, Math.floor(warningCustomMaxHours / 24)),
  );

  const isDirty =
    JSON.stringify(draftSettings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    if (!isDirty || autosaveRevision === 0) return;
    if (warningValidationError) return;

    const settingsToSave = draftSettings;
    const timeoutId = window.setTimeout(() => {
      startTransition(async () => {
        const result = await saveDomainSettings(
          domain.id,
          settingsToSave,
          targetUserId,
        );

        if (!result.success) {
          setSaveState("error");
          setSaveError(result.error);
          return;
        }

        setSavedSettings(settingsToSave);
        setSaveState("saved");
      });
    }, 420);

    return () => window.clearTimeout(timeoutId);
  }, [
    autosaveRevision,
    domain.id,
    draftSettings,
    isDirty,
    startTransition,
    targetUserId,
    warningValidationError,
  ]);

  const statusLabel =
    warningValidationError && isDirty
      ? warningValidationError
      : saveState === "error"
      ? saveError || "save failed"
      : isPending || isDirty
        ? "saving..."
        : saveState === "saved"
          ? "saved"
          : "";

  const tabs: Array<{ key: SettingsTabKey; label: string; num: string }> = [
    { key: "behavior", label: "Behavior", num: "01" },
    { key: "motion", label: "Motion", num: "02" },
    { key: "visual", label: "Visual", num: "03" },
  ];

  const driftSummaryLabel =
    draftSettings.driftMode === "NEVER"
      ? "off"
      : formatDriftThresholdLabel(draftSettings.driftThresholdHours);
  const warningSummaryLabel =
    draftSettings.warningLeadHours === null
      ? "off"
      : formatDriftThresholdLabel(draftSettings.warningLeadHours);

  const currentConfigItems = [
    { label: "Drift", value: driftSummaryLabel },
    { label: "Warn", value: warningSummaryLabel },
    {
      label: "Commit",
      value:
        draftSettings.commitmentRequirement === "STANDARD"
          ? "standard"
          : "passive",
    },
    { label: "Speed", value: draftSettings.orbitSpeed.toLowerCase() },
    {
      label: "Shape",
      value:
        draftSettings.orbitEccentricity === "DEFAULT"
          ? "default"
          : draftSettings.orbitEccentricity === "SLIGHTLY_ELLIPTICAL"
            ? "slight"
            : "very",
    },
    { label: "Visual", value: draftSettings.visualIntensity.toLowerCase() },
    { label: "Size", value: `${Math.round(draftSettings.planetSizeScale * 100)}%` },
  ];

  const previewPlanetVisual = buildPreviewPlanetVisual(
    color,
    draftSettings.visualIntensity,
  );
  const previewOrbitRatio = getOrbitEccentricityRatio(
    draftSettings.orbitEccentricity,
  );
  const previewSemiMajor = 62;
  const previewSemiMinor = previewSemiMajor * previewOrbitRatio;
  const previewAngle = -0.72;
  const previewPlanetX = Math.cos(previewAngle) * previewSemiMajor;
  const previewPlanetY = Math.sin(previewAngle) * previewSemiMinor;
  const previewPlanetSize = getPreviewPlanetSize(
    Number.isFinite(domain.positionX) ? domain.positionX : 0.6,
    draftSettings.planetSizeScale,
  );

  return (
    <main className="min-h-screen bg-black pb-20 text-white">
      <div className="border-b border-white/[0.05] bg-black/60">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-4 sm:px-8 md:px-10">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link
              href={homeHref}
              className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-600 transition-colors hover:text-zinc-300"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M7.5 2.5 4 6l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Axis
            </Link>
            <div className="h-4 w-px bg-white/[0.06]" />
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-600 transition-colors hover:text-zinc-300"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M7.5 2.5 4 6l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </Link>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-600">
              Planet Settings
            </p>
            <h1
              className="mt-2 truncate text-lg font-semibold tracking-tight text-zinc-200 sm:text-2xl"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              {domain.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/[0.04] px-5 pb-8 pt-10 sm:px-8 lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div>
            <p className="mb-3 text-[8px] font-mono uppercase tracking-[0.5em] text-zinc-700">
              Sections
            </p>
            <div className="space-y-[1px]">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-all duration-150 ${
                      active
                        ? ""
                        : "text-zinc-600 hover:bg-white/[0.02] hover:text-zinc-400"
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: withAlpha(accentColor, 0.05),
                            color: accentColor,
                          }
                        : undefined
                    }
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full"
                        style={{
                          backgroundColor: accentColor,
                          boxShadow: `0 0 8px ${withAlpha(accentColor, 0.4)}`,
                        }}
                      />
                    ) : null}
                    <span
                      className="text-[9px] font-mono"
                      style={{
                        color: active ? withAlpha(accentColor, 0.62) : undefined,
                      }}
                    >
                      {tab.num}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em]">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <p className="mb-3 text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-700">
              Current Configuration
            </p>
            <div className="h-px bg-white/[0.04]" />
            {currentConfigItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-700">
                  {item.label}
                </span>
                <span className="text-[10px] font-mono text-zinc-300">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center text-center">
            <div className="flex h-48 w-full max-w-[210px] items-center justify-center overflow-hidden rounded-[24px] border border-white/[0.04] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_60%)]">
              <div className="relative h-[150px] w-[170px]">
                <div
                  className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                  style={{
                    boxShadow:
                      "0 0 4px #fff, 0 0 10px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.5), 0 0 50px rgba(254,243,199,0.3), 0 0 90px rgba(103,232,249,0.12)",
                  }}
                />
                <svg
                  className="absolute"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                  style={{
                    width: previewSemiMajor * 2,
                    height: previewSemiMinor * 2,
                    left: `calc(50% - ${previewSemiMajor}px)`,
                    top: `calc(50% - ${previewSemiMinor}px)`,
                    overflow: "visible",
                  }}
                >
                  <ellipse
                    cx="50"
                    cy="50"
                    rx="49"
                    ry="49"
                    fill="none"
                    stroke={previewPlanetVisual.ringColor}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div
                  className="absolute rounded-full"
                  style={{
                    width: previewPlanetSize * 3.4,
                    height: previewPlanetSize * 3.4,
                    top: "50%",
                    left: "50%",
                    transform: `translate(${previewPlanetX}px, ${previewPlanetY}px) translate(-50%, -50%)`,
                    background: `radial-gradient(circle, ${withAlpha(previewPlanetVisual.color, 0.15)} 0%, transparent 72%)`,
                    filter:
                      draftSettings.visualIntensity === "INTENSE"
                        ? "blur(10px)"
                        : `blur(${draftSettings.visualIntensity === "SUBTLE" ? 6 : 8}px)`,
                    opacity:
                      draftSettings.visualIntensity === "SUBTLE"
                        ? 0.72
                        : draftSettings.visualIntensity === "INTENSE"
                          ? 0.9
                          : 0.82,
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: previewPlanetSize,
                    height: previewPlanetSize,
                    top: "50%",
                    left: "50%",
                    transform: `translate(${previewPlanetX}px, ${previewPlanetY}px) translate(-50%, -50%)`,
                    backgroundColor: previewPlanetVisual.color,
                    boxShadow: previewPlanetVisual.glow,
                  }}
                />
              </div>
            </div>

            <p
              className="mt-5 text-center text-lg font-semibold tracking-tight text-zinc-200"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              {domain.name}
            </p>
            <p
              className="mt-2 text-center text-[10px] font-mono uppercase tracking-[0.38em]"
              style={{ color: accentColor, textShadow: `0 0 14px ${withAlpha(accentColor, 0.35)}` }}
            >
              LIVE
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => {
                applySettings(defaultSettings);
                queueAutosave();
              }}
              disabled={isPending && !isDirty}
              className="inline-flex items-center justify-center rounded border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-white/16 hover:bg-white/[0.04] hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Restore to defaults
            </button>
            {statusLabel ? (
              <p className="mt-3 text-center text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-700">
                {statusLabel}
              </p>
            ) : null}
          </div>
        </aside>

        <div className="px-5 pb-8 pt-10 sm:px-8 md:px-16 md:pt-12">
          <div className="max-w-xl">
            {activeTab === "behavior" ? (
              <div>
                <div className="mb-1 flex items-baseline gap-3">
                  <span className="text-[9px] font-mono text-zinc-700">01</span>
                  <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-600">
                    Behavior
                  </p>
                  <div className="ml-3 h-px flex-1 bg-white/[0.06]" />
                </div>

                <SettingRow
                  label="Time Until Drift Without Commitment"
                  detail="By default, planets drift after 72 hours without commitment. Change it only for this planet if needed."
                >
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      ["24h", "48h", "72h", "96h", "7d", "never", "custom"] as DriftSelectValue[]
                    ).map((value) => (
                      <Pill
                        key={value}
                        value={value}
                        current={driftSelect}
                        label={value === "never" ? "Never" : value === "custom" ? "Custom" : value}
                        accentColor={accentColor}
                        onChange={(nextValue) => {
                          setDriftSelect(nextValue);
                          queueAutosave();
                        }}
                      />
                    ))}
                  </div>

                  {driftSelect === "custom" ? (
                    <div className="mt-4 rounded border border-white/[0.04] bg-white/[0.015] p-4">
                      <div className="mb-3 flex flex-wrap gap-3">
                        <Pill
                          value="hours"
                          current={customUnit}
                          label="Hours"
                          accentColor={accentColor}
                          onChange={changeCustomUnit}
                        />
                        <Pill
                          value="days"
                          current={customUnit}
                          label="Days"
                          accentColor={accentColor}
                          onChange={changeCustomUnit}
                        />
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={customUnit === "days" ? 7 : 168}
                        step={1}
                        value={customValue}
                        onChange={(e) => {
                          setCustomValue(Number(e.target.value));
                          queueAutosave();
                        }}
                        className="settings-range w-full"
                        style={{
                          background: `linear-gradient(90deg, rgba(255,255,255,0.1), ${withAlpha(accentColor, 0.28)}, rgba(255,255,255,0.08))`,
                        }}
                      />
                      <div className="mt-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                        <span>1 {customUnit === "days" ? "day" : "hour"}</span>
                        <span>
                          {customValue} {customUnit}
                        </span>
                        <span>
                          {customUnit === "days" ? "7 days" : "168 hours"}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </SettingRow>

                <SettingRow
                  label="Warn Before Drift"
                  detail="When Axis warns you before this planet drifts."
                >
                  <div
                    className={`space-y-4 transition-opacity ${
                      isWarningDisabled ? "opacity-45" : ""
                    }`}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          "off",
                          "1h",
                          "3h",
                          "6h",
                          "12h",
                          "24h",
                          "custom",
                        ] as WarningLeadSelectValue[]
                      ).map((value) => {
                        const numericHours =
                          value === "custom" || value === "off"
                            ? null
                            : Number.parseInt(value, 10);
                        const exceedsDriftDuration =
                          numericHours !== null &&
                          maxWarningLeadHours !== null &&
                          numericHours > maxWarningLeadHours;

                        return (
                          <Pill
                            key={value}
                            value={value}
                            current={warningLeadSelect}
                            label={
                              value === "off"
                                ? "Off"
                                : value === "custom"
                                  ? "Custom"
                                  : value
                            }
                            accentColor={accentColor}
                            disabled={isWarningDisabled || exceedsDriftDuration}
                            onChange={(nextValue) => {
                              setWarningLeadSelect(nextValue);
                              queueAutosave();
                            }}
                          />
                        );
                      })}
                    </div>

                    {warningLeadSelect === "custom" ? (
                      <div className="rounded border border-white/[0.04] bg-white/[0.015] p-4">
                        <div className="mb-3 flex flex-wrap gap-3">
                          <Pill
                            value="hours"
                            current={warningCustomUnit}
                            label="Hours"
                            accentColor={accentColor}
                            disabled={isWarningDisabled}
                            onChange={changeWarningCustomUnit}
                          />
                          <Pill
                            value="days"
                            current={warningCustomUnit}
                            label="Days"
                            accentColor={accentColor}
                            disabled={isWarningDisabled || !canUseWarningDays}
                            onChange={changeWarningCustomUnit}
                          />
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={
                            warningCustomUnit === "days"
                              ? warningCustomMaxDays
                              : warningCustomMaxHours
                          }
                          step={1}
                          value={warningCustomValue}
                          disabled={isWarningDisabled}
                          onChange={(e) => {
                            setWarningCustomValue(Number(e.target.value));
                            queueAutosave();
                          }}
                          className="settings-range w-full disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            background: `linear-gradient(90deg, rgba(255,255,255,0.1), ${withAlpha(accentColor, 0.28)}, rgba(255,255,255,0.08))`,
                          }}
                        />
                        <div className="mt-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                          <span>
                            1 {warningCustomUnit === "days" ? "day" : "hour"}
                          </span>
                          <span>
                            {warningCustomValue} {warningCustomUnit}
                          </span>
                          <span>
                            {warningCustomUnit === "days"
                              ? `${warningCustomMaxDays} day${warningCustomMaxDays === 1 ? "" : "s"}`
                              : `${warningCustomMaxHours} hour${warningCustomMaxHours === 1 ? "" : "s"}`}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {isWarningDisabled ? (
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-700">
                        Warnings are off while drift is set to Never.
                      </p>
                    ) : null}
                    {warningValidationError ? (
                      <p className="text-[11px] leading-relaxed text-red-400/80">
                        {warningValidationError}
                      </p>
                    ) : null}
                  </div>
                </SettingRow>

                <SettingRow
                  label="Commitment Requirement"
                  detail="Standard preserves the current app behavior. Passive counts reaching the commit section as a recommit."
                >
                  <div className="flex flex-wrap gap-2">
                    <Pill
                      value="STANDARD"
                      current={commitmentRequirement}
                      label="Standard"
                      accentColor={accentColor}
                      onChange={(value) => {
                        setCommitmentRequirement(value);
                        queueAutosave();
                      }}
                    />
                    <Pill
                      value="PASSIVE_ALIGNMENT"
                      current={commitmentRequirement}
                      label="Passive"
                      accentColor={accentColor}
                      onChange={(value) => {
                        setCommitmentRequirement(value);
                        queueAutosave();
                      }}
                    />
                  </div>
                </SettingRow>
              </div>
            ) : null}

            {activeTab === "motion" ? (
              <div>
                <div className="mb-1 flex items-baseline gap-3">
                  <span className="text-[9px] font-mono text-zinc-700">02</span>
                  <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-600">
                    Motion
                  </p>
                  <div className="ml-3 h-px flex-1 bg-white/[0.06]" />
                </div>

                <SettingRow
                  label="Orbit Speed"
                  detail="Standard equals the current Axis motion. Other options layer on top of that base behavior."
                >
                  <div className="flex flex-wrap gap-2">
                    {(["STILL", "SLOW", "STANDARD", "FAST"] as const).map((value) => (
                      <Pill
                        key={value}
                        value={value}
                        current={orbitSpeed}
                        label={value.toLowerCase()}
                        accentColor={accentColor}
                        onChange={(nextValue) => {
                          setOrbitSpeed(nextValue);
                          queueAutosave();
                        }}
                      />
                    ))}
                  </div>
                </SettingRow>

                <SettingRow
                  label="Orbit Eccentricity"
                  detail="Default preserves the current orbit shape. Elliptical modes only alter the path shape."
                >
                  <div className="flex flex-wrap gap-2">
                    <Pill
                      value="DEFAULT"
                      current={orbitEccentricity}
                      label="Default"
                      accentColor={accentColor}
                      onChange={(value) => {
                        setOrbitEccentricity(value);
                        queueAutosave();
                      }}
                    />
                    <Pill
                      value="SLIGHTLY_ELLIPTICAL"
                      current={orbitEccentricity}
                      label="Slightly elliptical"
                      accentColor={accentColor}
                      onChange={(value) => {
                        setOrbitEccentricity(value);
                        queueAutosave();
                      }}
                    />
                    <Pill
                      value="VERY_ELLIPTICAL"
                      current={orbitEccentricity}
                      label="Very elliptical"
                      accentColor={accentColor}
                      onChange={(value) => {
                        setOrbitEccentricity(value);
                        queueAutosave();
                      }}
                    />
                  </div>
                </SettingRow>
              </div>
            ) : null}

            {activeTab === "visual" ? (
              <div>
                <div className="mb-1 flex items-baseline gap-3">
                  <span className="text-[9px] font-mono text-zinc-700">03</span>
                  <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-600">
                    Visual
                  </p>
                  <div className="ml-3 h-px flex-1 bg-white/[0.06]" />
                </div>

                <SettingRow
                  label="Visual Intensity"
                  detail="Balanced matches the current live planet look exactly."
                >
                  <div className="flex flex-wrap gap-2">
                    <Pill
                      value="SUBTLE"
                      current={visualIntensity}
                      label="Subtle"
                      accentColor={accentColor}
                      onChange={(value) => {
                        setVisualIntensity(value);
                        queueAutosave();
                      }}
                    />
                    <Pill
                      value="BALANCED"
                      current={visualIntensity}
                      label="Balanced"
                      accentColor={accentColor}
                      onChange={(value) => {
                        setVisualIntensity(value);
                        queueAutosave();
                      }}
                    />
                    <Pill
                      value="INTENSE"
                      current={visualIntensity}
                      label="Intense"
                      accentColor={accentColor}
                      onChange={(value) => {
                        setVisualIntensity(value);
                        queueAutosave();
                      }}
                    />
                  </div>
                </SettingRow>

                <SettingRow
                  label="Planet Size"
                  detail="Midpoint equals the current default size behavior. The far left scales down to 30% of default."
                >
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-600">30%</span>
                      <span className="text-[11px] font-mono" style={{ color: accentColor }}>
                        {Math.round(planetSizeScale * 100)}%
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600">170%</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={170}
                      step={1}
                      value={Math.round(planetSizeScale * 100)}
                      onChange={(e) => {
                        setPlanetSizeScale(Number(e.target.value) / 100);
                        queueAutosave();
                      }}
                      className="settings-range w-full"
                      style={{
                        accentColor: accentColor,
                        background: `linear-gradient(90deg, rgba(255,255,255,0.1), ${withAlpha(accentColor, 0.28)}, rgba(255,255,255,0.08))`,
                      }}
                    />
                  </div>
                </SettingRow>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
