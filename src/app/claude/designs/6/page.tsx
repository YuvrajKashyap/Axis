"use client";

import Link from "next/link";
import { useState } from "react";
import { DesignNav } from "../DesignNav";
import { useSettingsState, type DriftSelectValue } from "../useSettingsState";

/*
 * Design 6: TACTICAL (Valorant-inspired)
 * Left tab nav for sections. Right content area with disciplined rows.
 * Sharp corners, high-contrast active states.
 * Clean grouping, no rounded corners, precise spacing.
 * Tactical restraint with Axis identity.
 */

type TabKey = "behavior" | "motion" | "visual";

function Btn<T extends string>({
  value,
  current,
  label,
  onChange,
}: {
  value: T;
  current: T;
  label: string;
  onChange: (v: T) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`relative px-4 py-2 text-[10px] font-mono uppercase tracking-[0.2em] border transition-all duration-150 ${
        active
          ? "border-white/20 bg-white/[0.06] text-white"
          : "border-white/[0.04] text-zinc-600 hover:border-white/10 hover:text-zinc-400"
      }`}
      style={{ borderRadius: 0 }}
    >
      {active && (
        <span className="absolute top-0 left-0 h-full w-[2px] bg-white" />
      )}
      {label}
    </button>
  );
}

function SettingRow({
  label,
  desc,
  right,
  children,
}: {
  label: string;
  desc?: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/[0.03] py-6">
      <div className="flex items-start justify-between gap-6 mb-4">
        <div>
          <h3 className="text-[13px] font-medium text-zinc-200">
            {label}
          </h3>
          {desc && (
            <p className="mt-1.5 text-[11px] text-zinc-600 leading-relaxed max-w-lg">
              {desc}
            </p>
          )}
        </div>
        {right && (
          <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 mt-0.5">
            {right}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-[2px]">
        {children}
      </div>
    </div>
  );
}

export default function Design6() {
  const s = useSettingsState();
  const [activeTab, setActiveTab] = useState<TabKey>("behavior");

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white pb-20">
      {/* Top bar */}
      <div className="border-b border-white/[0.05] bg-black/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              ← Axis
            </Link>
            <div className="h-4 w-px bg-white/[0.06]" />
            <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-600">
              Settings
            </span>
          </div>
          <h1
            className="text-lg font-semibold tracking-tight text-zinc-200"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Mercury
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-[200px_1fr]">
          {/* Left nav tabs */}
          <nav className="border-r border-white/[0.04] pt-8 px-4 lg:sticky lg:top-0 lg:h-[calc(100vh-65px)]">
            <p className="text-[8px] font-mono uppercase tracking-[0.5em] text-zinc-700 mb-4 px-2">
              Sections
            </p>
            <div className="space-y-[1px]">
              {(
                [
                  { key: "behavior", label: "Behavior", num: "01" },
                  { key: "motion", label: "Motion", num: "02" },
                  { key: "visual", label: "Visual", num: "03" },
                ] as const
              ).map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-all duration-150 ${
                      active
                        ? "bg-white/[0.04] text-white"
                        : "text-zinc-600 hover:bg-white/[0.02] hover:text-zinc-400"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    {active && (
                      <span className="absolute left-4 h-6 w-[2px] bg-white" />
                    )}
                    <span className="text-[9px] font-mono text-zinc-700">
                      {tab.num}
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em]">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Readout */}
            <div className="mt-12 px-2">
              <p className="text-[8px] font-mono uppercase tracking-[0.5em] text-zinc-700 mb-4">
                Active Config
              </p>
              <div className="space-y-2.5">
                {[
                  ["Drift", s.draftSettings.driftMode === "NEVER" ? "Off" : s.driftLabel],
                  ["Commit", s.commitmentRequirement === "STANDARD" ? "Std" : "Passive"],
                  ["Speed", s.orbitSpeed.toLowerCase()],
                  ["Shape", s.orbitEccentricity === "DEFAULT" ? "circle" : s.orbitEccentricity === "SLIGHTLY_ELLIPTICAL" ? "slight" : "very"],
                  ["Glow", s.visualIntensity.toLowerCase()],
                  ["Size", `${Math.round(s.planetSizeScale * 100)}%`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-zinc-700">{k}</span>
                    <span className="text-[9px] font-mono text-zinc-400">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </nav>

          {/* Content area */}
          <div className="px-8 pt-8 pb-12 md:px-12">
            {/* Behavior tab */}
            {activeTab === "behavior" && (
              <div>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-[9px] font-mono text-zinc-700">01</span>
                  <h2 className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-400">
                    Behavior
                  </h2>
                  <div className="flex-1 h-px bg-white/[0.04] ml-4" />
                </div>

                <SettingRow
                  label="Time Until Drift"
                  desc="How long before this planet auto-drifts from its last qualifying alignment."
                  right={s.driftLabel}
                >
                  {(["24h", "48h", "72h", "96h", "7d", "never", "custom"] as DriftSelectValue[]).map(
                    (v) => (
                      <Btn key={v} value={v} current={s.driftSelect} label={v} onChange={s.setDriftSelect} />
                    ),
                  )}
                </SettingRow>

                {s.driftSelect === "custom" && (
                  <div className="border-b border-white/[0.03] py-5 pl-6 border-l-2 border-l-white/[0.08]">
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600 mb-4">
                      Custom Threshold
                    </p>
                    <div className="flex gap-[2px] mb-4">
                      <Btn value="hours" current={s.customUnit} label="Hours" onChange={s.setCustomUnit} />
                      <Btn value="days" current={s.customUnit} label="Days" onChange={s.setCustomUnit} />
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={s.customUnit === "days" ? 7 : 168}
                      value={s.customValue}
                      onChange={(e) => s.setCustomValue(Number(e.target.value))}
                      className="w-full max-w-md accent-white"
                    />
                    <div className="mt-2 flex max-w-md justify-between text-[10px] font-mono text-zinc-700">
                      <span>1</span>
                      <span className="text-zinc-400">{s.customValue} {s.customUnit}</span>
                      <span>{s.customUnit === "days" ? "7" : "168"}</span>
                    </div>
                  </div>
                )}

                <SettingRow
                  label="Commitment Requirement"
                  desc="Standard preserves the current app behavior. Passive Alignment counts reaching the commit section as a recommit."
                >
                  <Btn value="STANDARD" current={s.commitmentRequirement} label="Standard" onChange={s.setCommitmentRequirement} />
                  <Btn value="PASSIVE_ALIGNMENT" current={s.commitmentRequirement} label="Passive Alignment" onChange={s.setCommitmentRequirement} />
                </SettingRow>
              </div>
            )}

            {/* Motion tab */}
            {activeTab === "motion" && (
              <div>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-[9px] font-mono text-zinc-700">02</span>
                  <h2 className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-400">
                    Motion
                  </h2>
                  <div className="flex-1 h-px bg-white/[0.04] ml-4" />
                </div>

                <SettingRow label="Orbit Speed" desc="Standard equals the current Axis motion.">
                  {(["STILL", "SLOW", "STANDARD", "FAST"] as const).map((v) => (
                    <Btn key={v} value={v} current={s.orbitSpeed} label={v.toLowerCase()} onChange={s.setOrbitSpeed} />
                  ))}
                </SettingRow>

                <SettingRow label="Orbit Eccentricity" desc="Default preserves the current orbit shape.">
                  <Btn value="DEFAULT" current={s.orbitEccentricity} label="Default" onChange={s.setOrbitEccentricity} />
                  <Btn value="SLIGHTLY_ELLIPTICAL" current={s.orbitEccentricity} label="Slightly Elliptical" onChange={s.setOrbitEccentricity} />
                  <Btn value="VERY_ELLIPTICAL" current={s.orbitEccentricity} label="Very Elliptical" onChange={s.setOrbitEccentricity} />
                </SettingRow>
              </div>
            )}

            {/* Visual tab */}
            {activeTab === "visual" && (
              <div>
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-[9px] font-mono text-zinc-700">03</span>
                  <h2 className="text-[11px] font-mono uppercase tracking-[0.4em] text-zinc-400">
                    Visual
                  </h2>
                  <div className="flex-1 h-px bg-white/[0.04] ml-4" />
                </div>

                <SettingRow label="Visual Intensity" desc="Balanced matches the current live planet look.">
                  <Btn value="SUBTLE" current={s.visualIntensity} label="Subtle" onChange={s.setVisualIntensity} />
                  <Btn value="BALANCED" current={s.visualIntensity} label="Balanced" onChange={s.setVisualIntensity} />
                  <Btn value="INTENSE" current={s.visualIntensity} label="Intense" onChange={s.setVisualIntensity} />
                </SettingRow>

                <SettingRow
                  label="Planet Size"
                  desc="Midpoint equals the current default size behavior."
                  right={`${Math.round(s.planetSizeScale * 100)}%`}
                >
                  <div className="w-full max-w-md">
                    <input
                      type="range"
                      min={30}
                      max={170}
                      value={Math.round(s.planetSizeScale * 100)}
                      onChange={(e) => s.setPlanetSizeScale(Number(e.target.value) / 100)}
                      className="w-full accent-white"
                    />
                    <div className="mt-2 flex justify-between text-[10px] font-mono text-zinc-700">
                      <span>30%</span>
                      <span>100%</span>
                      <span>170%</span>
                    </div>
                  </div>
                </SettingRow>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-800">
          Design exploration 6 · Tactical
        </p>
      </div>

      <DesignNav />
    </main>
  );
}
