"use client";

import Link from "next/link";
import { DesignNav } from "../DesignNav";
import { useSettingsState, type DriftSelectValue } from "../useSettingsState";

/*
 * Design 5: GRID MATRIX
 * Dense instrument-panel grid. All settings visible at once.
 * Each setting is a self-contained cell with clear boundaries.
 * Think mixing console / instrument panel.
 */

function Toggle<T extends string>({
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
      className={`rounded border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] transition-all duration-200 ${
        active
          ? "border-cyan-400/30 bg-cyan-400/[0.06] text-cyan-300 shadow-[inset_0_0_12px_rgba(103,232,249,0.04)]"
          : "border-white/[0.04] text-zinc-700 hover:border-white/10 hover:text-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}

function Cell({
  label,
  span,
  children,
  right,
}: {
  label: string;
  span?: 2;
  children: React.ReactNode;
  right?: string;
}) {
  return (
    <div
      className={`relative rounded-lg border border-white/[0.04] bg-white/[0.012] p-5 ${
        span === 2 ? "md:col-span-2" : ""
      }`}
    >
      {/* Subtle top-left accent line */}
      <div className="absolute top-0 left-0 h-px w-8 bg-gradient-to-r from-cyan-400/20 to-transparent" />
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500">
          {label}
        </span>
        {right && (
          <span className="text-[10px] font-mono text-zinc-600">{right}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Design5() {
  const s = useSettingsState();

  return (
    <main className="min-h-screen bg-[#030304] text-white pb-20">
      <div className="mx-auto max-w-5xl px-5 pt-10 md:px-10 md:pt-14">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-10">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-700 hover:text-zinc-300 transition-colors"
            >
              <span>←</span> Back
            </Link>
            <div className="mt-6 flex items-baseline gap-4">
              <h1
                className="text-3xl font-semibold tracking-tight text-zinc-100 md:text-4xl"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                Mercury
              </h1>
              <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-700">
                Planet Config
              </span>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-4 mt-8">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* Row: Section header - Behavior */}
          <div className="md:col-span-2 pt-2 pb-1">
            <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-600">
              Behavior
            </p>
          </div>

          {/* Drift threshold */}
          <Cell label="Drift Threshold" span={2} right={s.driftLabel}>
            <div className="flex flex-wrap gap-1.5">
              {(["24h", "48h", "72h", "96h", "7d", "never", "custom"] as DriftSelectValue[]).map(
                (v) => (
                  <Toggle key={v} value={v} current={s.driftSelect} label={v} onChange={s.setDriftSelect} />
                ),
              )}
            </div>
            {s.driftSelect === "custom" && (
              <div className="mt-4 rounded border border-white/[0.04] bg-black/40 p-4">
                <div className="flex gap-2 mb-3">
                  <Toggle value="hours" current={s.customUnit} label="Hrs" onChange={s.setCustomUnit} />
                  <Toggle value="days" current={s.customUnit} label="Days" onChange={s.setCustomUnit} />
                </div>
                <input
                  type="range"
                  min={1}
                  max={s.customUnit === "days" ? 7 : 168}
                  value={s.customValue}
                  onChange={(e) => s.setCustomValue(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <p className="mt-1 text-right text-[10px] font-mono text-zinc-600">
                  {s.customValue} {s.customUnit}
                </p>
              </div>
            )}
          </Cell>

          {/* Commitment */}
          <Cell label="Commitment">
            <div className="flex gap-1.5">
              <Toggle value="STANDARD" current={s.commitmentRequirement} label="Standard" onChange={s.setCommitmentRequirement} />
              <Toggle value="PASSIVE_ALIGNMENT" current={s.commitmentRequirement} label="Passive" onChange={s.setCommitmentRequirement} />
            </div>
          </Cell>

          {/* Orbit speed */}
          <Cell label="Orbit Speed">
            <div className="flex gap-1.5">
              {(["STILL", "SLOW", "STANDARD", "FAST"] as const).map((v) => (
                <Toggle key={v} value={v} current={s.orbitSpeed} label={v.toLowerCase()} onChange={s.setOrbitSpeed} />
              ))}
            </div>
          </Cell>

          {/* Section header - Motion & Visual */}
          <div className="md:col-span-2 pt-4 pb-1">
            <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-600">
              Motion & Visual
            </p>
          </div>

          {/* Eccentricity */}
          <Cell label="Eccentricity">
            <div className="flex gap-1.5">
              <Toggle value="DEFAULT" current={s.orbitEccentricity} label="Default" onChange={s.setOrbitEccentricity} />
              <Toggle value="SLIGHTLY_ELLIPTICAL" current={s.orbitEccentricity} label="Slight" onChange={s.setOrbitEccentricity} />
              <Toggle value="VERY_ELLIPTICAL" current={s.orbitEccentricity} label="Very" onChange={s.setOrbitEccentricity} />
            </div>
          </Cell>

          {/* Visual intensity */}
          <Cell label="Intensity">
            <div className="flex gap-1.5">
              <Toggle value="SUBTLE" current={s.visualIntensity} label="Subtle" onChange={s.setVisualIntensity} />
              <Toggle value="BALANCED" current={s.visualIntensity} label="Balanced" onChange={s.setVisualIntensity} />
              <Toggle value="INTENSE" current={s.visualIntensity} label="Intense" onChange={s.setVisualIntensity} />
            </div>
          </Cell>

          {/* Planet size - full width */}
          <Cell label="Planet Size" span={2} right={`${Math.round(s.planetSizeScale * 100)}%`}>
            <input
              type="range"
              min={30}
              max={170}
              value={Math.round(s.planetSizeScale * 100)}
              onChange={(e) => s.setPlanetSizeScale(Number(e.target.value) / 100)}
              className="w-full accent-cyan-400"
            />
            <div className="mt-2 flex justify-between text-[10px] font-mono text-zinc-700">
              <span>30%</span>
              <span>100% default</span>
              <span>170%</span>
            </div>
          </Cell>

          {/* Summary readout */}
          <Cell label="Readout" span={2}>
            <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
              {[
                ["DFT", s.draftSettings.driftMode === "NEVER" ? "OFF" : s.driftLabel.toUpperCase()],
                ["CMT", s.commitmentRequirement === "STANDARD" ? "STD" : "PSV"],
                ["SPD", s.orbitSpeed.slice(0, 3)],
                ["ECC", s.orbitEccentricity === "DEFAULT" ? "DEF" : s.orbitEccentricity === "SLIGHTLY_ELLIPTICAL" ? "SLT" : "VRY"],
                ["VIS", s.visualIntensity.slice(0, 3)],
                ["SIZ", `${Math.round(s.planetSizeScale * 100)}%`],
              ].map(([k, v]) => (
                <div key={k} className="text-center">
                  <p className="text-[9px] font-mono text-zinc-700 mb-1">{k}</p>
                  <p className="text-[13px] font-mono text-cyan-300">{v}</p>
                </div>
              ))}
            </div>
          </Cell>
        </div>

        <p className="mt-12 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-800">
          Design exploration 5 · Grid Matrix
        </p>
      </div>

      <DesignNav />
    </main>
  );
}
