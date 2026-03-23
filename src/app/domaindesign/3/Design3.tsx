"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SampleDomain } from "../data";
import "./design3.css";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/*
 * Design 3: "Sequence"
 * Scroll-snapping full-viewport sections. Each section is one screen:
 * 1) Planet + name hero
 * 2) Vision
 * 3) Reason + Cost (split)
 * 4) Commitment
 * Smooth, cinematic progression. Minimal text per screen.
 */
export function Design3({ domain }: { domain: SampleDomain }) {
  const color = domain.color ?? "#67e8f9";
  const { r, g, b } = hexToRgb(color);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white d3-snap-container">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute d3-ambient rounded-full"
          style={{
            width: 500, height: 500,
            top: "20%", left: "50%",
            transform: "translateX(-50%)",
            background: `radial-gradient(circle, rgba(${r},${g},${b},0.04) 0%, transparent 70%)`,
            filter: "blur(80px)",
          }}
        />
      </div>

      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Fixed nav */}
      <div className="fixed top-0 left-0 right-0 z-30 px-8 md:px-12 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-700 hover:text-zinc-400 transition-colors"
        >
          ← Axis
        </Link>
        <p
          className="text-[9px] font-mono tracking-[0.3em] uppercase"
          style={{ color: `rgba(${r},${g},${b},0.3)` }}
        >
          {domain.status}
        </p>
      </div>

      {/* Section 1: Hero */}
      <section className="d3-snap-section min-h-screen flex flex-col items-center justify-center px-6 relative z-10">
        <div
          className={`d3-planet rounded-full mb-8 transition-all duration-1000 ${
            mounted ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
          style={{
            width: 12, height: 12,
            backgroundColor: color,
            boxShadow: `0 0 8px rgba(${r},${g},${b},0.8), 0 0 24px rgba(${r},${g},${b},0.4), 0 0 60px rgba(${r},${g},${b},0.12)`,
          }}
        />
        <h1
          className={`text-5xl md:text-7xl font-semibold tracking-tight text-center transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          {domain.name}
        </h1>
        {domain.identity && (
          <p
            className={`mt-5 text-sm text-zinc-600 text-center max-w-sm transition-all duration-1000 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: "600ms" }}
          >
            {domain.identity}
          </p>
        )}

        {/* Scroll cue */}
        <div className="absolute bottom-16 d3-scroll">
          <div
            className="w-px h-10"
            style={{
              background: `linear-gradient(to bottom, rgba(${r},${g},${b},0.25), transparent)`,
            }}
          />
        </div>
      </section>

      {/* Section 2: Vision */}
      <section className="d3-snap-section min-h-screen flex items-center justify-center px-6 relative z-10">
        <div className="max-w-lg text-center">
          <p
            className="text-[10px] font-mono tracking-[0.5em] uppercase mb-8"
            style={{ color: `rgba(${r},${g},${b},0.4)` }}
          >
            Vision
          </p>
          <p className="text-xl md:text-2xl font-light leading-10 text-zinc-200">
            {domain.vision || "No vision defined yet."}
          </p>
        </div>
      </section>

      {/* Section 3: Reason + Cost */}
      <section className="d3-snap-section min-h-screen flex items-center justify-center px-6 relative z-10">
        <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
          {/* Reason */}
          <div className="text-center md:text-right">
            <p
              className="text-[10px] font-mono tracking-[0.5em] uppercase mb-6"
              style={{ color: `rgba(${r},${g},${b},0.4)` }}
            >
              Reason
            </p>
            <p className="text-base leading-8 text-zinc-300 font-light">
              {domain.primaryReason || "No reason defined yet."}
            </p>
          </div>

          {/* Divider (vertical on desktop) */}
          <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="w-px h-24"
              style={{
                background: `linear-gradient(to bottom, transparent, rgba(${r},${g},${b},0.15), transparent)`,
              }}
            />
          </div>

          {/* Cost */}
          <div className="text-center md:text-left">
            <p
              className="text-[10px] font-mono tracking-[0.5em] uppercase mb-6"
              style={{ color: "rgba(248,113,113,0.4)" }}
            >
              Cost
            </p>
            <p className="text-base leading-8 text-zinc-300 font-light">
              {domain.primaryCost || domain.currentReality || "No cost defined yet."}
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Commitment */}
      <section className="d3-snap-section min-h-screen flex items-center justify-center px-6 relative z-10">
        <div className="max-w-md w-full text-center">
          <div
            className="w-px h-12 mx-auto mb-8"
            style={{
              background: `linear-gradient(to bottom, transparent, rgba(${r},${g},${b},0.2))`,
            }}
          />
          <p
            className="text-[10px] font-mono tracking-[0.5em] uppercase mb-8"
            style={{ color: `rgba(${r},${g},${b},0.3)` }}
          >
            Commit
          </p>
          <input
            type="text"
            placeholder="Today I will..."
            className="w-full bg-transparent text-center text-lg text-white outline-none border-b border-zinc-800 pb-4 placeholder:text-zinc-800 focus:border-zinc-600 transition-colors"
          />
          <button
            className="mt-8 text-[10px] font-mono tracking-[0.4em] uppercase transition-colors duration-500 hover:text-white"
            style={{ color: `rgba(${r},${g},${b},0.4)` }}
          >
            Lock in →
          </button>
        </div>
      </section>
    </main>
  );
}
