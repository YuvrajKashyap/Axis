"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SampleDomain } from "../data";
import "./design5.css";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/*
 * Design 5: "Gravity"
 * Planet hero at top. Below: a large centered "focus zone" —
 * three labels float around it. Click/hover a label and it pulls into
 * the focus zone, displaying its content with a smooth morph.
 * Only one visible at a time. Commitment at the very bottom.
 * Feels like navigating a personal space station.
 */
export function Design5({ domain }: { domain: SampleDomain }) {
  const color = domain.color ?? "#67e8f9";
  const { r, g, b } = hexToRgb(color);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const fields = [
    { label: "Vision", value: domain.vision },
    { label: "Reason", value: domain.primaryReason },
    { label: "Cost", value: domain.primaryCost ?? domain.currentReality },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute d5-ambient rounded-full"
          style={{
            width: 500, height: 500,
            top: "10%", left: "50%",
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

      {/* Nav */}
      <div className="fixed top-0 left-0 right-0 z-30 px-8 md:px-12 py-6">
        <Link
          href="/"
          className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-700 hover:text-zinc-400 transition-colors"
        >
          ← Axis
        </Link>
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <div className="min-h-[55vh] flex flex-col items-center justify-center px-6">
          <div
            className={`d5-planet rounded-full mb-8 transition-all duration-1000 ${
              mounted ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
            style={{
              width: 12, height: 12,
              backgroundColor: color,
              boxShadow: `0 0 8px rgba(${r},${g},${b},0.8), 0 0 24px rgba(${r},${g},${b},0.4), 0 0 60px rgba(${r},${g},${b},0.12)`,
            }}
          />
          <h1
            className={`text-5xl md:text-6xl font-semibold tracking-tight text-center transition-all duration-1000 ${
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
        </div>

        {/* Navigation tabs */}
        <div className="max-w-2xl mx-auto px-8">
          <div
            className={`flex items-center justify-center gap-12 transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "800ms" }}
          >
            {fields.map((f, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={f.label}
                  onClick={() => setSelected(isSelected ? null : i)}
                  className="relative py-3 transition-all duration-500 group"
                >
                  <span
                    className="text-[10px] font-mono tracking-[0.4em] uppercase transition-colors duration-500"
                    style={{
                      color: isSelected
                        ? color
                        : `rgba(${r},${g},${b},0.3)`,
                    }}
                  >
                    {f.label}
                  </span>
                  {/* Active indicator */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px transition-all duration-500"
                    style={{
                      backgroundColor: isSelected ? color : "transparent",
                      boxShadow: isSelected ? `0 0 8px rgba(${r},${g},${b},0.4)` : "none",
                      transform: isSelected ? "scaleX(1)" : "scaleX(0)",
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Content zone */}
          <div
            className="mt-12 min-h-[120px] flex items-center justify-center"
          >
            {selected !== null && fields[selected].value ? (
              <div
                key={selected}
                className="d5-content-enter text-center max-w-lg"
              >
                <p className="text-base md:text-lg leading-8 text-zinc-200 font-light">
                  {fields[selected].value}
                </p>
              </div>
            ) : selected !== null ? (
              <p className="text-sm text-zinc-700 d5-content-enter">Not defined yet.</p>
            ) : (
              <p
                className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-800 transition-opacity"
              >
                Select a field to focus
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="mt-16 mb-12 flex justify-center">
            <div
              className="w-px h-12"
              style={{
                background: `linear-gradient(to bottom, rgba(${r},${g},${b},0.15), transparent)`,
              }}
            />
          </div>

          {/* Commitment */}
          <div
            className={`text-center pb-20 transition-all duration-1000 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: "1000ms" }}
          >
            <p
              className="text-[10px] font-mono tracking-[0.4em] uppercase mb-6"
              style={{ color: `rgba(${r},${g},${b},0.25)` }}
            >
              Commit
            </p>
            <input
              type="text"
              placeholder="Today I will..."
              className="w-full max-w-md mx-auto bg-transparent text-center text-base text-white outline-none border-b border-zinc-800 pb-3 placeholder:text-zinc-800 focus:border-zinc-600 transition-colors"
            />
            <div className="mt-6">
              <button
                className="text-[10px] font-mono tracking-[0.4em] uppercase transition-colors duration-500 hover:text-white"
                style={{ color: `rgba(${r},${g},${b},0.35)` }}
              >
                Lock in →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
