"use client";

import {
  DEFAULT_DOMAIN_SETTINGS,
  DEFAULT_DRIFT_THRESHOLD_HOURS,
  DRIFT_PRESET_HOURS,
  formatDriftThresholdLabel,
  getOrbitEccentricityRatio,
  getVisualIntensityMultiplier,
  normalizeDomainSettings,
  type DomainCommitmentRequirementValue,
  type DomainDriftModeValue,
  type DomainOrbitEccentricityValue,
  type DomainOrbitSpeedValue,
  type DomainSettingsSnapshot,
  type DomainVisualIntensityValue,
} from "@/lib/domain-settings";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveDomainSettings } from "./actions";
import "./settings.css";

type DomainSettingsViewProps = {
  domain: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
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

function getPreviewPlanetSize(scale: number) {
  return Math.max(10, Math.min(36, 18 * scale));
}

function SegmentedOption<T extends string>({
  value,
  current,
  label,
  onChange,
}: {
  value: T;
  current: T;
  label: string;
  onChange: (value: T) => void;
}) {
  const active = current === value;

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`settings-segment rounded-full px-4 py-2 text-[10px] font-mono uppercase tracking-[0.28em] transition-colors duration-300 ${
        active ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
      }`}
      data-active={active ? "true" : "false"}
    >
      {label}
    </button>
  );
}

export function DomainSettingsView({
  domain,
  settings,
  backHref,
  homeHref,
  targetUserId,
}: DomainSettingsViewProps) {
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

  const color = domain.color ?? "#67e8f9";

  const effectiveCustomHours =
    customUnit === "days" ? Math.min(7, customValue) * 24 : Math.min(168, customValue);

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

  const isDirty =
    JSON.stringify(draftSettings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    if (!isDirty || autosaveRevision === 0) return;

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
  }, [autosaveRevision, domain.id, draftSettings, isDirty, startTransition, targetUserId]);

  const statusLabel =
    saveState === "error"
      ? saveError || "save failed"
      : isPending || isDirty
        ? "saving..."
        : saveState === "saved"
          ? "saved"
          : "";

  const previewGlow = getVisualIntensityMultiplier(visualIntensity);
  const previewPlanetSize = getPreviewPlanetSize(planetSizeScale);
  const previewOrbitScaleY = getOrbitEccentricityRatio(orbitEccentricity);
  const previewSemiMajor = 70;
  const previewSemiMinor = previewSemiMajor * previewOrbitScaleY;
  const previewAngle = -0.72;
  const previewPlanetX = Math.cos(previewAngle) * previewSemiMajor;
  const previewPlanetY = Math.sin(previewAngle) * previewSemiMinor;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 md:px-12 md:py-10">
        <div className="mb-10 flex items-start justify-between gap-6">
          <div className="relative space-y-4">
            <Link
              href={homeHref}
              className="fixed top-5 left-4 z-30 inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-700 transition-colors hover:text-zinc-300 sm:left-5 md:top-7 md:left-7"
            >
              <span aria-hidden>←</span>
              Axis
            </Link>
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-700 transition-colors hover:text-zinc-300"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </Link>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.42em] text-zinc-600">
                Planet Settings
              </p>
              <h1
                className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                {domain.name}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500">
                Defaults preserve the current Axis behavior exactly. Change only what this planet needs.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            <button
              type="button"
              onClick={() => {
                applySettings(defaultSettings);
                queueAutosave();
              }}
              disabled={isPending && !isDirty}
              className="inline-flex items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.03] px-4 py-2 text-[9px] font-mono uppercase tracking-[0.28em] text-zinc-300 transition-colors hover:border-white/18 hover:bg-white/[0.05] hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Restore to defaults
            </button>
            {statusLabel ? (
              <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-700">
                {statusLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            <section className="settings-panel rounded-[28px] border border-white/[0.06] px-5 py-6 sm:px-7 sm:py-7">
              <div className="mb-7">
                <p className="text-[10px] font-mono uppercase tracking-[0.38em] text-zinc-500">
                  Behavior
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
                  By default, planets drift after 72 hours without commitment. You can override that for this planet without affecting the rest of the system.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-medium text-zinc-100">
                        Time Until Drift Without Commitment
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-zinc-500">
                        Sets when this planet should auto-drift from its last qualifying alignment touch.
                      </p>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-600">
                      {driftSelect === "never"
                        ? "drift disabled"
                        : formatDriftThresholdLabel(
                            driftSelect === "custom"
                              ? effectiveCustomHours
                              : driftSelect === "7d"
                                ? 168
                                : Number.parseInt(driftSelect, 10),
                          )}
                    </p>
                  </div>

                  <select
                    value={driftSelect}
                    onChange={(e) => {
                      const value = e.target.value as DriftSelectValue;
                      setDriftSelect(value);
                      queueAutosave();
                    }}
                    className="settings-select w-full rounded-2xl border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-200 outline-none"
                  >
                    <option value="24h">24h</option>
                    <option value="48h">48h</option>
                    <option value="72h">72h (default)</option>
                    <option value="96h">96h</option>
                    <option value="7d">7d</option>
                    <option value="never">Never</option>
                    <option value="custom">Custom</option>
                  </select>

                  {driftSelect === "custom" && (
                    <div className="mt-4 rounded-[22px] border border-white/[0.05] bg-white/[0.02] p-4">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">
                          Custom threshold
                        </p>
                        <div className="flex items-center gap-2">
                          <SegmentedOption
                            value="hours"
                            current={customUnit}
                            label="Hours"
                            onChange={(value) => {
                              setCustomUnit(value);
                              queueAutosave();
                            }}
                          />
                          <SegmentedOption
                            value="days"
                            current={customUnit}
                            label="Days"
                            onChange={(value) => {
                              setCustomUnit(value);
                              queueAutosave();
                            }}
                          />
                        </div>
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
                      />
                      <div className="mt-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                        <span>1 {customUnit === "days" ? "day" : "hour"}</span>
                        <span>{customValue} {customUnit}</span>
                        <span>{customUnit === "days" ? "7 days" : "168 hours max"}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-4">
                    <h2 className="text-sm font-medium text-zinc-100">
                      Commitment Requirement
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-zinc-500">
                      Standard preserves the current app behavior. Passive Alignment counts reaching the commit section as a recommit even without typed text.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SegmentedOption
                      value="STANDARD"
                      current={commitmentRequirement}
                      label="Standard"
                      onChange={(value) => {
                        setCommitmentRequirement(value);
                        queueAutosave();
                      }}
                    />
                    <SegmentedOption
                      value="PASSIVE_ALIGNMENT"
                      current={commitmentRequirement}
                      label="Passive Alignment"
                      onChange={(value) => {
                        setCommitmentRequirement(value);
                        queueAutosave();
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-panel rounded-[28px] border border-white/[0.06] px-5 py-6 sm:px-7 sm:py-7">
              <div className="mb-7">
                <p className="text-[10px] font-mono uppercase tracking-[0.38em] text-zinc-500">
                  Motion
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
                  These controls change how this planet moves without altering the rest of the orrery.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-sm font-medium text-zinc-100">Orbit Speed</h2>
                  <p className="mt-2 text-sm leading-7 text-zinc-500">
                    Standard equals the current Axis motion. Other options layer on top of that base behavior.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SegmentedOption value="STILL" current={orbitSpeed} label="Still" onChange={(value) => {
                      setOrbitSpeed(value);
                      queueAutosave();
                    }} />
                    <SegmentedOption value="SLOW" current={orbitSpeed} label="Slow" onChange={(value) => {
                      setOrbitSpeed(value);
                      queueAutosave();
                    }} />
                    <SegmentedOption value="STANDARD" current={orbitSpeed} label="Standard" onChange={(value) => {
                      setOrbitSpeed(value);
                      queueAutosave();
                    }} />
                    <SegmentedOption value="FAST" current={orbitSpeed} label="Fast" onChange={(value) => {
                      setOrbitSpeed(value);
                      queueAutosave();
                    }} />
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-medium text-zinc-100">Orbit Eccentricity</h2>
                  <p className="mt-2 text-sm leading-7 text-zinc-500">
                    Default preserves the current orbit shape. Elliptical modes only alter the path shape.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SegmentedOption
                      value="DEFAULT"
                      current={orbitEccentricity}
                      label="Default"
                      onChange={(value) => {
                        setOrbitEccentricity(value);
                        queueAutosave();
                      }}
                    />
                    <SegmentedOption
                      value="SLIGHTLY_ELLIPTICAL"
                      current={orbitEccentricity}
                      label="Slightly Elliptical"
                      onChange={(value) => {
                        setOrbitEccentricity(value);
                        queueAutosave();
                      }}
                    />
                    <SegmentedOption
                      value="VERY_ELLIPTICAL"
                      current={orbitEccentricity}
                      label="Very Elliptical"
                      onChange={(value) => {
                        setOrbitEccentricity(value);
                        queueAutosave();
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-panel rounded-[28px] border border-white/[0.06] px-5 py-6 sm:px-7 sm:py-7">
              <div className="mb-7">
                <p className="text-[10px] font-mono uppercase tracking-[0.38em] text-zinc-500">
                  Visual
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500">
                  Balanced and the slider midpoint preserve the current exact visual baseline.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-sm font-medium text-zinc-100">Visual Intensity</h2>
                  <p className="mt-2 text-sm leading-7 text-zinc-500">
                    Balanced matches the current live planet look exactly.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SegmentedOption value="SUBTLE" current={visualIntensity} label="Subtle" onChange={(value) => {
                      setVisualIntensity(value);
                      queueAutosave();
                    }} />
                    <SegmentedOption value="BALANCED" current={visualIntensity} label="Balanced" onChange={(value) => {
                      setVisualIntensity(value);
                      queueAutosave();
                    }} />
                    <SegmentedOption value="INTENSE" current={visualIntensity} label="Intense" onChange={(value) => {
                      setVisualIntensity(value);
                      queueAutosave();
                    }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-medium text-zinc-100">Planet Size</h2>
                      <p className="mt-2 text-sm leading-7 text-zinc-500">
                        Midpoint equals the current default size behavior. The far left scales down to 30% of default.
                      </p>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-600">
                      {Math.round(planetSizeScale * 100)}%
                    </p>
                  </div>
                  <div className="mt-4 rounded-[22px] border border-white/[0.05] bg-white/[0.02] p-4">
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
                    />
                    <div className="mt-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-600">
                      <span>30%</span>
                      <span>Current midpoint</span>
                      <span>170%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="settings-panel sticky top-8 h-fit rounded-[28px] border border-white/[0.06] px-5 py-6">
            <p className="text-[10px] font-mono uppercase tracking-[0.38em] text-zinc-500">
              Live Preview
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-500">
              This preview reflects the current draft settings. Save is explicit.
            </p>

            <div className="mt-8 rounded-[24px] border border-white/[0.04] bg-black/40 p-6">
              <div className="relative mx-auto flex h-56 w-full items-center justify-center overflow-hidden rounded-[22px] border border-white/[0.04] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_60%)]">
                <div className="absolute h-4 w-4 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8),0_0_32px_rgba(255,255,255,0.24)]" />
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
                    stroke="rgba(103,232,249,0.08)"
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
                    background: `radial-gradient(circle, ${color}22 0%, transparent 72%)`,
                    filter:
                      visualIntensity === "INTENSE"
                        ? "blur(12px)"
                        : `blur(${8 * previewGlow}px)`,
                    opacity:
                      visualIntensity === "INTENSE"
                        ? 0.98
                        : Math.min(1, 0.72 * previewGlow),
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
                    backgroundColor: color,
                    boxShadow:
                      visualIntensity === "INTENSE"
                        ? `0 0 10px ${color}, 0 0 18px ${color}, 0 0 28px ${color}dd, 0 0 44px ${color}88`
                        : `0 0 ${14 * previewGlow}px ${color}, 0 0 ${32 * previewGlow}px ${color}55`,
                  }}
                />
              </div>

              <div className="mt-5 space-y-3 text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-600">
                <div className="flex items-center justify-between">
                  <span>Drift</span>
                  <span className="text-zinc-300">
                    {draftSettings.driftMode === "NEVER"
                      ? "deactivated"
                      : formatDriftThresholdLabel(draftSettings.driftThresholdHours)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Commit</span>
                  <span className="text-zinc-300">
                    {draftSettings.commitmentRequirement === "STANDARD"
                      ? "standard"
                      : "passive"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Motion</span>
                  <span className="text-zinc-300">{draftSettings.orbitSpeed.toLowerCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Visual</span>
                  <span className="text-zinc-300">{draftSettings.visualIntensity.toLowerCase()}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
