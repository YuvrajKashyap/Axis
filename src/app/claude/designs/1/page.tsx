"use client";

import Link from "next/link";
import { DesignNav } from "../DesignNav";
import { useSettingsState, type DriftSelectValue } from "../useSettingsState";

/*
 * Design 1: MONOLITH
 * Single-column brutalist editorial. No panels, no cards.
 * Raw typography on open black space with fine horizontal rules.
 * Maximum negative space. Each setting is a breathing row.
 */

function Seg<T extends string>({
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
      className={`text-[11px] font-mono uppercase tracking-[0.22em] transition-colors duration-200 ${
        active
          ? "text-white"
          : "text-zinc-700 hover:text-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}

export default function Design1() {
  const s = useSettingsState();

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      <div className="mx-auto max-w-2xl px-6 pt-16 md:pt-24">
        {/* Header */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-700 transition-colors hover:text-zinc-300"
        >
          <span aria-hidden>←</span> Back
        </Link>

        <div className="mt-16">
          <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-zinc-600">
            Planet Settings
          </p>
          <h1
            className="mt-4 text-5xl font-semibold tracking-tight text-zinc-100 md:text-7xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Mercury
          </h1>
        </div>

        {/* Behavior */}
        <div className="mt-24">
          <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-zinc-500">
            Behavior
          </p>
          <div className="mt-1 h-px bg-white/[0.06]" />
        </div>

        <div className="mt-12 space-y-16">
          {/* Drift threshold */}
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[13px] font-medium text-zinc-200">
                Time Until Drift
              </h2>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
                {s.driftLabel}
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-7 text-zinc-600">
              How long before this planet drifts without commitment.
            </p>
            <div className="mt-6 flex flex-wrap gap-6">
              {(["24h", "48h", "72h", "96h", "7d", "never", "custom"] as DriftSelectValue[]).map(
                (v) => (
                  <Seg
                    key={v}
                    value={v}
                    current={s.driftSelect}
                    label={v === "72h" ? "72h ·" : v}
                    onChange={s.setDriftSelect}
                  />
                ),
              )}
            </div>

            {s.driftSelect === "custom" && (
              <div className="mt-8">
                <div className="flex items-center gap-6 mb-4">
                  <Seg value="hours" current={s.customUnit} label="Hours" onChange={s.setCustomUnit} />
                  <Seg value="days" current={s.customUnit} label="Days" onChange={s.setCustomUnit} />
                </div>
                <input
                  type="range"
                  min={1}
                  max={s.customUnit === "days" ? 7 : 168}
                  step={1}
                  value={s.customValue}
                  onChange={(e) => s.setCustomValue(Number(e.target.value))}
                  className="w-full accent-white"
                  style={{
                    accentColor: "white",
                    height: "2px",
                  }}
                />
                <div className="mt-2 flex justify-between text-[10px] font-mono text-zinc-700">
                  <span>1</span>
                  <span>{s.customValue} {s.customUnit}</span>
                  <span>{s.customUnit === "days" ? "7" : "168"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Commitment */}
          <div>
            <h2 className="text-[13px] font-medium text-zinc-200">
              Commitment Requirement
            </h2>
            <p className="mt-3 text-[13px] leading-7 text-zinc-600">
              Standard requires typed text. Passive counts reaching the section.
            </p>
            <div className="mt-6 flex gap-8">
              <Seg value="STANDARD" current={s.commitmentRequirement} label="Standard" onChange={s.setCommitmentRequirement} />
              <Seg value="PASSIVE_ALIGNMENT" current={s.commitmentRequirement} label="Passive" onChange={s.setCommitmentRequirement} />
            </div>
          </div>
        </div>

        {/* Motion */}
        <div className="mt-24">
          <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-zinc-500">
            Motion
          </p>
          <div className="mt-1 h-px bg-white/[0.06]" />
        </div>

        <div className="mt-12 space-y-16">
          <div>
            <h2 className="text-[13px] font-medium text-zinc-200">
              Orbit Speed
            </h2>
            <div className="mt-6 flex gap-8">
              {(["STILL", "SLOW", "STANDARD", "FAST"] as const).map((v) => (
                <Seg key={v} value={v} current={s.orbitSpeed} label={v.toLowerCase()} onChange={s.setOrbitSpeed} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[13px] font-medium text-zinc-200">
              Orbit Eccentricity
            </h2>
            <div className="mt-6 flex gap-8">
              <Seg value="DEFAULT" current={s.orbitEccentricity} label="Default" onChange={s.setOrbitEccentricity} />
              <Seg value="SLIGHTLY_ELLIPTICAL" current={s.orbitEccentricity} label="Slight" onChange={s.setOrbitEccentricity} />
              <Seg value="VERY_ELLIPTICAL" current={s.orbitEccentricity} label="Very" onChange={s.setOrbitEccentricity} />
            </div>
          </div>
        </div>

        {/* Visual */}
        <div className="mt-24">
          <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-zinc-500">
            Visual
          </p>
          <div className="mt-1 h-px bg-white/[0.06]" />
        </div>

        <div className="mt-12 space-y-16">
          <div>
            <h2 className="text-[13px] font-medium text-zinc-200">
              Visual Intensity
            </h2>
            <div className="mt-6 flex gap-8">
              <Seg value="SUBTLE" current={s.visualIntensity} label="Subtle" onChange={s.setVisualIntensity} />
              <Seg value="BALANCED" current={s.visualIntensity} label="Balanced" onChange={s.setVisualIntensity} />
              <Seg value="INTENSE" current={s.visualIntensity} label="Intense" onChange={s.setVisualIntensity} />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[13px] font-medium text-zinc-200">
                Planet Size
              </h2>
              <span className="text-[10px] font-mono text-zinc-600">
                {Math.round(s.planetSizeScale * 100)}%
              </span>
            </div>
            <div className="mt-6">
              <input
                type="range"
                min={30}
                max={170}
                step={1}
                value={Math.round(s.planetSizeScale * 100)}
                onChange={(e) => s.setPlanetSizeScale(Number(e.target.value) / 100)}
                className="w-full accent-white"
                style={{ accentColor: "white", height: "2px" }}
              />
              <div className="mt-2 flex justify-between text-[10px] font-mono text-zinc-700">
                <span>30%</span>
                <span>170%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-32 h-px bg-white/[0.04]" />
        <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-800">
          Design exploration 1 · Monolith
        </p>
      </div>

      <DesignNav />
    </main>
  );
}
