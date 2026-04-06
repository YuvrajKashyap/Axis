"use client";

import Link from "next/link";
import { useState } from "react";
import { DesignNav } from "../DesignNav";
import { useSettingsState, type DriftSelectValue } from "../useSettingsState";

/*
 * Design 2: DOSSIER (Hybrid)
 * Two-column layout. Fixed left column = section tabs + live summary.
 * Right column = one section at a time, dense compact rows.
 * Cyan active accents from Grid Matrix. Tab nav from Tactical.
 * Planet name in top header bar from Tactical.
 */

type TabKey = "behavior" | "motion" | "visual";

function Pill<T extends string>({
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
      className={`rounded px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.18em] border transition-all duration-200 ${
        active
          ? "border-cyan-400/30 bg-cyan-400/[0.06] text-cyan-300 shadow-[inset_0_0_12px_rgba(103,232,249,0.04)]"
          : "border-white/[0.04] bg-transparent text-zinc-600 hover:border-white/10 hover:text-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}

function Row({
  label,
  detail,
  children,
}: {
  label: string;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/[0.04] py-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-[12px] font-medium text-zinc-200 tracking-wide">
            {label}
          </h3>
          {detail && (
            <p className="mt-1 text-[11px] text-zinc-600 leading-relaxed max-w-md">
              {detail}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Design2() {
  const s = useSettingsState();
  const [activeTab, setActiveTab] = useState<TabKey>("behavior");

  const tabs = [
    { key: "behavior" as const, label: "Behavior", num: "01" },
    { key: "motion" as const, label: "Motion", num: "02" },
    { key: "visual" as const, label: "Visual", num: "03" },
  ];

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      {/* Top header bar */}
      <div className="border-b border-white/[0.05] bg-black/60">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              ← Axis
            </Link>
            <div className="h-4 w-px bg-white/[0.06]" />
            <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-600">
              Planet Settings
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

      <div className="grid min-h-[calc(100vh-57px)] lg:grid-cols-[280px_1fr]">
        {/* Left identity column */}
        <aside className="border-r border-white/[0.04] px-8 pt-10 pb-8 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-700">
              Dossier
            </p>
            <p className="mt-2 text-[11px] text-zinc-600 leading-relaxed">
              Configure per-planet behavior. Defaults preserve the current Axis system.
            </p>
          </div>

          {/* Section tabs */}
          <div className="mt-10">
            <p className="text-[8px] font-mono uppercase tracking-[0.5em] text-zinc-700 mb-3">
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
                        ? "bg-cyan-400/[0.04] text-cyan-300"
                        : "text-zinc-600 hover:bg-white/[0.02] hover:text-zinc-400"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(103,232,249,0.4)]" />
                    )}
                    <span className={`text-[9px] font-mono ${active ? "text-cyan-400/60" : "text-zinc-700"}`}>
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

          {/* Live summary */}
          <div className="mt-10 space-y-4">
            <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-700 mb-3">
              Current Configuration
            </p>
            <div className="h-px bg-white/[0.04]" />
            {[
              ["Drift", s.draftSettings.driftMode === "NEVER" ? "off" : s.driftLabel],
              ["Commit", s.commitmentRequirement === "STANDARD" ? "standard" : "passive"],
              ["Speed", s.orbitSpeed.toLowerCase()],
              ["Eccentricity", s.orbitEccentricity === "DEFAULT" ? "default" : s.orbitEccentricity === "SLIGHTLY_ELLIPTICAL" ? "slight" : "very"],
              ["Intensity", s.visualIntensity.toLowerCase()],
              ["Size", `${Math.round(s.planetSizeScale * 100)}%`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-700">
                  {k}
                </span>
                <span className="text-[10px] font-mono text-zinc-300">
                  {v}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <div
              className="mx-auto h-2 w-2 rounded-full bg-cyan-400"
              style={{
                boxShadow: "0 0 12px rgba(103,232,249,0.6), 0 0 32px rgba(103,232,249,0.2)",
              }}
            />
          </div>
        </aside>

        {/* Right settings column */}
        <div className="px-8 pt-10 pb-8 md:px-16 md:pt-12">
          <div className="max-w-xl">
            {/* Behavior */}
            {activeTab === "behavior" && (
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-[9px] font-mono text-zinc-700">01</span>
                  <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-600">
                    Behavior
                  </p>
                  <div className="flex-1 h-px bg-white/[0.06] ml-3" />
                </div>

                <Row
                  label="Time Until Drift"
                  detail="Duration before auto-drift from last alignment."
                >
                  <div className="flex flex-wrap gap-1.5">
                    {(["24h", "48h", "72h", "96h", "7d", "never", "custom"] as DriftSelectValue[]).map(
                      (v) => (
                        <Pill
                          key={v}
                          value={v}
                          current={s.driftSelect}
                          label={v}
                          onChange={s.setDriftSelect}
                        />
                      ),
                    )}
                  </div>
                  {s.driftSelect === "custom" && (
                    <div className="mt-4 rounded border border-white/[0.04] bg-white/[0.015] p-4">
                      <div className="flex gap-3 mb-3">
                        <Pill value="hours" current={s.customUnit} label="Hours" onChange={s.setCustomUnit} />
                        <Pill value="days" current={s.customUnit} label="Days" onChange={s.setCustomUnit} />
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={s.customUnit === "days" ? 7 : 168}
                        value={s.customValue}
                        onChange={(e) => s.setCustomValue(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                      <p className="mt-2 text-[10px] font-mono text-zinc-600 text-right">
                        {s.customValue} {s.customUnit}
                      </p>
                    </div>
                  )}
                </Row>

                <Row
                  label="Commitment Requirement"
                  detail="Standard requires explicit text. Passive counts presence."
                >
                  <div className="flex gap-2">
                    <Pill value="STANDARD" current={s.commitmentRequirement} label="Standard" onChange={s.setCommitmentRequirement} />
                    <Pill value="PASSIVE_ALIGNMENT" current={s.commitmentRequirement} label="Passive" onChange={s.setCommitmentRequirement} />
                  </div>
                </Row>
              </div>
            )}

            {/* Motion */}
            {activeTab === "motion" && (
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-[9px] font-mono text-zinc-700">02</span>
                  <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-600">
                    Motion
                  </p>
                  <div className="flex-1 h-px bg-white/[0.06] ml-3" />
                </div>

                <Row label="Orbit Speed" detail="Standard equals the current Axis motion.">
                  <div className="flex gap-2">
                    {(["STILL", "SLOW", "STANDARD", "FAST"] as const).map((v) => (
                      <Pill key={v} value={v} current={s.orbitSpeed} label={v.toLowerCase()} onChange={s.setOrbitSpeed} />
                    ))}
                  </div>
                </Row>

                <Row label="Orbit Eccentricity" detail="Default preserves the current orbit shape.">
                  <div className="flex gap-2">
                    <Pill value="DEFAULT" current={s.orbitEccentricity} label="Default" onChange={s.setOrbitEccentricity} />
                    <Pill value="SLIGHTLY_ELLIPTICAL" current={s.orbitEccentricity} label="Slightly elliptical" onChange={s.setOrbitEccentricity} />
                    <Pill value="VERY_ELLIPTICAL" current={s.orbitEccentricity} label="Very elliptical" onChange={s.setOrbitEccentricity} />
                  </div>
                </Row>
              </div>
            )}

            {/* Visual */}
            {activeTab === "visual" && (
              <div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-[9px] font-mono text-zinc-700">03</span>
                  <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-600">
                    Visual
                  </p>
                  <div className="flex-1 h-px bg-white/[0.06] ml-3" />
                </div>

                <Row label="Visual Intensity" detail="Balanced matches the current live planet look.">
                  <div className="flex gap-2">
                    <Pill value="SUBTLE" current={s.visualIntensity} label="Subtle" onChange={s.setVisualIntensity} />
                    <Pill value="BALANCED" current={s.visualIntensity} label="Balanced" onChange={s.setVisualIntensity} />
                    <Pill value="INTENSE" current={s.visualIntensity} label="Intense" onChange={s.setVisualIntensity} />
                  </div>
                </Row>

                <Row label="Planet Size" detail="Midpoint equals the current default size.">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono text-zinc-600">30%</span>
                      <span className="text-[11px] font-mono text-cyan-300">
                        {Math.round(s.planetSizeScale * 100)}%
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600">170%</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={170}
                      value={Math.round(s.planetSizeScale * 100)}
                      onChange={(e) => s.setPlanetSizeScale(Number(e.target.value) / 100)}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </Row>
              </div>
            )}
          </div>

          <p className="mt-16 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-800">
            Design exploration 2 · Dossier
          </p>
        </div>
      </div>

      <DesignNav />
    </main>
  );
}
