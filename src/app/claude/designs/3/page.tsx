"use client";

import Link from "next/link";
import { DesignNav } from "../DesignNav";
import { useSettingsState, type DriftSelectValue } from "../useSettingsState";

/*
 * Design 3: TERMINAL
 * Monospaced everything. Dense, functional, CLI-inspired.
 * Key:value pairs with inline toggles. Green cursor accents on black.
 * Pure function, zero decoration.
 */

function Opt<T extends string>({
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
      className={`font-mono text-[12px] transition-colors ${
        active
          ? "text-emerald-400"
          : "text-zinc-700 hover:text-zinc-400"
      }`}
    >
      {active ? `[${label}]` : ` ${label} `}
    </button>
  );
}

function Line({
  label,
  children,
  desc,
  right,
}: {
  label: string;
  children: React.ReactNode;
  desc?: string;
  right?: string;
}) {
  return (
    <div className="py-4">
      <div className="flex items-start gap-4">
        <span className="shrink-0 w-4 text-[12px] font-mono text-zinc-800 select-none">
          &gt;
        </span>
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[12px] font-mono text-zinc-400">
              {label}
            </span>
            {right && (
              <span className="text-[11px] font-mono text-zinc-700">
                {right}
              </span>
            )}
          </div>
          {desc && (
            <p className="mt-1 text-[11px] font-mono text-zinc-800 leading-relaxed">
              # {desc}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Design3() {
  const s = useSettingsState();

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-20 font-mono">
      <div className="mx-auto max-w-2xl px-6 pt-12 md:px-8 md:pt-16">
        {/* Header */}
        <Link
          href="/"
          className="text-[11px] text-zinc-700 hover:text-emerald-400 transition-colors"
        >
          ../axis
        </Link>

        <div className="mt-10 border-b border-zinc-900 pb-6">
          <p className="text-[11px] text-zinc-700">
            $ axis config --planet mercury
          </p>
          <h1 className="mt-3 text-[28px] font-normal text-zinc-100 tracking-tight">
            Mercury
          </h1>
          <p className="mt-1 text-[11px] text-zinc-700">
            planet-settings v1.0 · all changes auto-save
          </p>
        </div>

        {/* Behavior */}
        <div className="mt-10">
          <p className="text-[10px] uppercase tracking-[0.5em] text-emerald-400/60 mb-1">
            -- behavior --
          </p>
        </div>

        <Line
          label="drift.threshold"
          desc="time before auto-drift from last alignment"
          right={s.driftLabel}
        >
          {(["24h", "48h", "72h", "96h", "7d", "never", "custom"] as DriftSelectValue[]).map(
            (v) => (
              <Opt key={v} value={v} current={s.driftSelect} label={v} onChange={s.setDriftSelect} />
            ),
          )}
        </Line>

        {s.driftSelect === "custom" && (
          <div className="ml-8 border-l border-zinc-900 pl-6 pb-4">
            <div className="flex gap-4 mb-3">
              <Opt value="hours" current={s.customUnit} label="hours" onChange={s.setCustomUnit} />
              <Opt value="days" current={s.customUnit} label="days" onChange={s.setCustomUnit} />
            </div>
            <input
              type="range"
              min={1}
              max={s.customUnit === "days" ? 7 : 168}
              value={s.customValue}
              onChange={(e) => s.setCustomValue(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <p className="mt-1 text-[11px] text-zinc-700 text-right">
              = {s.customValue}{s.customUnit === "days" ? "d" : "h"}
            </p>
          </div>
        )}

        <Line
          label="commit.requirement"
          desc="standard = typed text, passive = presence only"
        >
          <Opt value="STANDARD" current={s.commitmentRequirement} label="standard" onChange={s.setCommitmentRequirement} />
          <Opt value="PASSIVE_ALIGNMENT" current={s.commitmentRequirement} label="passive" onChange={s.setCommitmentRequirement} />
        </Line>

        {/* Motion */}
        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.5em] text-emerald-400/60 mb-1">
            -- motion --
          </p>
        </div>

        <Line label="orbit.speed">
          {(["STILL", "SLOW", "STANDARD", "FAST"] as const).map((v) => (
            <Opt key={v} value={v} current={s.orbitSpeed} label={v.toLowerCase()} onChange={s.setOrbitSpeed} />
          ))}
        </Line>

        <Line label="orbit.eccentricity">
          <Opt value="DEFAULT" current={s.orbitEccentricity} label="default" onChange={s.setOrbitEccentricity} />
          <Opt value="SLIGHTLY_ELLIPTICAL" current={s.orbitEccentricity} label="slight" onChange={s.setOrbitEccentricity} />
          <Opt value="VERY_ELLIPTICAL" current={s.orbitEccentricity} label="very" onChange={s.setOrbitEccentricity} />
        </Line>

        {/* Visual */}
        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.5em] text-emerald-400/60 mb-1">
            -- visual --
          </p>
        </div>

        <Line label="visual.intensity">
          <Opt value="SUBTLE" current={s.visualIntensity} label="subtle" onChange={s.setVisualIntensity} />
          <Opt value="BALANCED" current={s.visualIntensity} label="balanced" onChange={s.setVisualIntensity} />
          <Opt value="INTENSE" current={s.visualIntensity} label="intense" onChange={s.setVisualIntensity} />
        </Line>

        <Line label="planet.size" right={`${Math.round(s.planetSizeScale * 100)}%`}>
          <div className="w-full">
            <input
              type="range"
              min={30}
              max={170}
              value={Math.round(s.planetSizeScale * 100)}
              onChange={(e) => s.setPlanetSizeScale(Number(e.target.value) / 100)}
              className="w-full accent-emerald-400"
            />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-800">
              <span>0.3x</span>
              <span>1.7x</span>
            </div>
          </div>
        </Line>

        <div className="mt-16 border-t border-zinc-900 pt-4">
          <p className="text-[10px] text-zinc-800">
            # design exploration 3 · terminal
          </p>
          <p className="mt-1 text-[10px] text-zinc-800">
            # end of config
          </p>
        </div>
      </div>

      <DesignNav />
    </main>
  );
}
