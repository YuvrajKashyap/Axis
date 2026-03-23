"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SampleDomain } from "../data";
import "./design1.css";

type DesignRow = {
  label: string;
  value: string | null;
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/*
 * Design 1: "Pulse"
 * Full-viewport planet hero → scroll into 3 minimal expandable rows
 * (vision, reason, cost). Each row is a single line that expands on hover
 * to reveal content. Commitment input at the bottom. Everything breathes.
 */
export function Design1({ domain }: { domain: SampleDomain }) {
  const color = domain.color ?? "#67e8f9";
  const { r, g, b } = hexToRgb(color);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const rows: DesignRow[] = [
    { label: "Vision", value: domain.vision },
    { label: "Reason", value: domain.primaryReason },
    { label: "Cost", value: domain.primaryCost ?? domain.currentReality },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute d1-ambient rounded-full"
          style={{
            width: 500, height: 500,
            top: "10%", left: "50%",
            transform: "translateX(-50%)",
            background: `radial-gradient(circle, rgba(${r},${g},${b},0.05) 0%, transparent 70%)`,
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)",
        }}
      />

      {/* Fixed nav */}
      <div className="fixed top-0 left-0 right-0 z-30 px-8 md:px-12 py-6">
        <Link
          href="/"
          className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-700 hover:text-zinc-400 transition-colors"
        >
          ← Axis
        </Link>
      </div>

      <div className="relative z-10">
        {/* Hero — full viewport */}
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          {/* Planet */}
          <div
            className={`d1-planet rounded-full mb-8 transition-all duration-1000 ${
              mounted ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
            style={{
              width: 12, height: 12,
              backgroundColor: color,
              boxShadow: `0 0 8px rgba(${r},${g},${b},0.8), 0 0 24px rgba(${r},${g},${b},0.4), 0 0 60px rgba(${r},${g},${b},0.12)`,
            }}
          />

          {/* Name */}
          <h1
            className={`text-5xl md:text-6xl font-semibold tracking-tight text-center transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            {domain.name}
          </h1>

          {/* Identity subtitle */}
          {domain.identity && (
            <p
              className={`mt-5 text-sm text-zinc-600 text-center max-w-sm leading-relaxed transition-all duration-1000 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "600ms" }}
            >
              {domain.identity}
            </p>
          )}

          {/* Scroll hint */}
          <div
            className={`absolute bottom-14 d1-scroll transition-all duration-1000 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: "1200ms" }}
          >
            <div
              className="w-px h-10 mx-auto"
              style={{
                background: `linear-gradient(to bottom, rgba(${r},${g},${b},0.3), transparent)`,
              }}
            />
          </div>
        </div>

        {/* Content rows */}
        <div className="max-w-2xl mx-auto px-8 pb-12">
          {rows.map((row: DesignRow, i: number) => {
            const isExpanded = expanded === i;
            const hasValue = !!row.value;
            return (
              <div
                key={row.label}
                className="border-b border-zinc-900/50 cursor-default"
                onMouseEnter={() => hasValue && setExpanded(i)}
                onMouseLeave={() => setExpanded(null)}
              >
                <div className="flex items-center justify-between py-5">
                  <p
                    className="text-[10px] font-mono tracking-[0.4em] uppercase transition-colors duration-500"
                    style={{
                      color: isExpanded
                        ? `rgba(${r},${g},${b},0.8)`
                        : `rgba(${r},${g},${b},0.3)`,
                    }}
                  >
                    {row.label}
                  </p>
                  <div
                    className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: isExpanded ? color : `rgba(${r},${g},${b},0.15)`,
                      boxShadow: isExpanded ? `0 0 6px rgba(${r},${g},${b},0.4)` : "none",
                    }}
                  />
                </div>
                <div
                  className="overflow-hidden transition-all duration-500 ease-out"
                  style={{
                    maxHeight: isExpanded ? 200 : 0,
                    opacity: isExpanded ? 1 : 0,
                  }}
                >
                  <p className="text-sm leading-7 text-zinc-300 pb-5">
                    {row.value}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Commitment */}
          <div className="mt-16 text-center">
            <p
              className="text-[10px] font-mono tracking-[0.4em] uppercase mb-6"
              style={{ color: `rgba(${r},${g},${b},0.3)` }}
            >
              Commit
            </p>
            <input
              type="text"
              placeholder="Today I will..."
              className="w-full max-w-md mx-auto bg-transparent text-center text-base text-white outline-none border-b border-zinc-800 pb-3 placeholder:text-zinc-800 focus:border-zinc-600 transition-colors"
            />
            <div className="mt-5">
              <button
                className="text-[10px] font-mono tracking-[0.4em] uppercase transition-colors duration-500 hover:text-white"
                style={{ color: `rgba(${r},${g},${b},0.4)` }}
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
