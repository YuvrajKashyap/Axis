"use client";

import Link from "next/link";
import { DesignNav } from "../DesignNav";
import { useSettingsState, type DriftSelectValue } from "../useSettingsState";

/*
 * Design 4: CINEMATIC
 * Full-bleed vertical sections. Each settings group owns a large vertical slice.
 * Oversized section titles, controls tucked in with precision.
 * Title-card energy. Breathes like a film.
 */

function Chip<T extends string>({
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
      className={`relative rounded-full border px-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.24em] transition-all duration-300 ${
        active
          ? "border-white/15 bg-white/[0.06] text-white shadow-[0_0_20px_rgba(255,255,255,0.04)]"
          : "border-white/[0.04] text-zinc-600 hover:border-white/10 hover:text-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative min-h-[60vh] flex flex-col justify-center border-b border-white/[0.03] px-8 py-24 md:px-20 lg:px-32">
      {/* Large background number */}
      <span
        className="pointer-events-none absolute top-12 right-8 text-[120px] font-bold leading-none text-white/[0.015] md:right-20 md:text-[200px]"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        {number}
      </span>

      <div className="relative z-10 max-w-xl">
        <p className="text-[9px] font-mono uppercase tracking-[0.5em] text-zinc-700 mb-3">
          {number}
        </p>
        <h2
          className="text-4xl font-semibold tracking-tight text-zinc-100 md:text-5xl"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          {title}
        </h2>
        <div className="mt-12 space-y-10">
          {children}
        </div>
      </div>
    </section>
  );
}

function Control({
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
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[13px] font-medium text-zinc-300">{label}</h3>
        {right && (
          <span className="text-[10px] font-mono text-zinc-700">{right}</span>
        )}
      </div>
      {desc && (
        <p className="mt-2 text-[12px] leading-relaxed text-zinc-600">{desc}</p>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function Design4() {
  const s = useSettingsState();

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      {/* Hero header */}
      <header className="relative flex min-h-[40vh] flex-col justify-end border-b border-white/[0.03] px-8 pb-16 md:px-20 lg:px-32">
        <Link
          href="/"
          className="absolute top-8 left-8 text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-700 hover:text-zinc-300 transition-colors md:left-20"
        >
          <span>←</span> Back
        </Link>

        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.6em] text-zinc-700">
            Planet Settings
          </p>
          <h1
            className="mt-4 text-6xl font-semibold tracking-tight text-zinc-100 md:text-8xl"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Mercury
          </h1>
          <p className="mt-6 max-w-md text-[13px] leading-relaxed text-zinc-600">
            Configure how this planet behaves within your system. Defaults preserve the current Axis behavior.
          </p>
        </div>
      </header>

      {/* Behavior */}
      <Section number="01" title="Behavior">
        <Control
          label="Time Until Drift"
          desc="Duration before this planet auto-drifts."
          right={s.driftLabel}
        >
          <div className="flex flex-wrap gap-2">
            {(["24h", "48h", "72h", "96h", "7d", "never", "custom"] as DriftSelectValue[]).map(
              (v) => (
                <Chip key={v} value={v} current={s.driftSelect} label={v} onChange={s.setDriftSelect} />
              ),
            )}
          </div>
          {s.driftSelect === "custom" && (
            <div className="mt-6 rounded-2xl border border-white/[0.04] bg-white/[0.015] p-5">
              <div className="flex gap-2 mb-4">
                <Chip value="hours" current={s.customUnit} label="Hours" onChange={s.setCustomUnit} />
                <Chip value="days" current={s.customUnit} label="Days" onChange={s.setCustomUnit} />
              </div>
              <input
                type="range"
                min={1}
                max={s.customUnit === "days" ? 7 : 168}
                value={s.customValue}
                onChange={(e) => s.setCustomValue(Number(e.target.value))}
                className="w-full accent-white"
              />
              <p className="mt-2 text-right text-[10px] font-mono text-zinc-600">
                {s.customValue} {s.customUnit}
              </p>
            </div>
          )}
        </Control>

        <Control
          label="Commitment Requirement"
          desc="Standard requires typed input. Passive counts presence."
        >
          <div className="flex gap-2">
            <Chip value="STANDARD" current={s.commitmentRequirement} label="Standard" onChange={s.setCommitmentRequirement} />
            <Chip value="PASSIVE_ALIGNMENT" current={s.commitmentRequirement} label="Passive" onChange={s.setCommitmentRequirement} />
          </div>
        </Control>
      </Section>

      {/* Motion */}
      <Section number="02" title="Motion">
        <Control label="Orbit Speed">
          <div className="flex gap-2">
            {(["STILL", "SLOW", "STANDARD", "FAST"] as const).map((v) => (
              <Chip key={v} value={v} current={s.orbitSpeed} label={v.toLowerCase()} onChange={s.setOrbitSpeed} />
            ))}
          </div>
        </Control>

        <Control label="Orbit Eccentricity">
          <div className="flex gap-2">
            <Chip value="DEFAULT" current={s.orbitEccentricity} label="Default" onChange={s.setOrbitEccentricity} />
            <Chip value="SLIGHTLY_ELLIPTICAL" current={s.orbitEccentricity} label="Slightly elliptical" onChange={s.setOrbitEccentricity} />
            <Chip value="VERY_ELLIPTICAL" current={s.orbitEccentricity} label="Very elliptical" onChange={s.setOrbitEccentricity} />
          </div>
        </Control>
      </Section>

      {/* Visual */}
      <Section number="03" title="Visual">
        <Control label="Visual Intensity">
          <div className="flex gap-2">
            <Chip value="SUBTLE" current={s.visualIntensity} label="Subtle" onChange={s.setVisualIntensity} />
            <Chip value="BALANCED" current={s.visualIntensity} label="Balanced" onChange={s.setVisualIntensity} />
            <Chip value="INTENSE" current={s.visualIntensity} label="Intense" onChange={s.setVisualIntensity} />
          </div>
        </Control>

        <Control label="Planet Size" right={`${Math.round(s.planetSizeScale * 100)}%`}>
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
            <span>170%</span>
          </div>
        </Control>
      </Section>

      {/* Footer */}
      <div className="px-8 py-12 md:px-20">
        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-800">
          Design exploration 4 · Cinematic
        </p>
      </div>

      <DesignNav />
    </main>
  );
}
