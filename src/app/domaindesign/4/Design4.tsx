"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SampleDomain } from "../data";
import "./design4.css";

type DesignBlock = {
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
 * Design 4: "Whisper"
 * Ultra-minimal. Planet hero, then 3 text blocks stacked vertically.
 * Each shows only the label when idle. Hover: the label shifts left,
 * a glowing accent line appears, and the content fades in.
 * Only one block can be active at a time. Very quiet, very intentional.
 */
export function Design4({ domain }: { domain: SampleDomain }) {
  const color = domain.color ?? "#67e8f9";
  const { r, g, b } = hexToRgb(color);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const blocks: DesignBlock[] = [
    { label: "Vision", value: domain.vision },
    { label: "Reason", value: domain.primaryReason },
    { label: "Cost", value: domain.primaryCost ?? domain.currentReality },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute rounded-full d4-ambient"
          style={{
            width: 400, height: 400,
            top: "15%", left: "50%",
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
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)",
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
        <div className="min-h-[65vh] flex flex-col items-center justify-center px-6">
          <div
            className={`d4-planet rounded-full mb-8 transition-all duration-1000 ${
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

        {/* Blocks */}
        <div className="max-w-xl mx-auto px-8 pb-8">
          {blocks.map((block: DesignBlock, i: number) => {
            const isActive = active === i;
            const hasValue = !!block.value;
            return (
              <div
                key={block.label}
                className={`relative py-8 cursor-default transition-all duration-700 ${
                  mounted ? "opacity-100" : "opacity-0"
                }`}
                style={{ transitionDelay: `${800 + i * 150}ms` }}
                onMouseEnter={() => hasValue && setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {/* Accent line */}
                <div
                  className="absolute left-0 top-8 bottom-8 w-px transition-all duration-700"
                  style={{
                    backgroundColor: isActive ? color : "transparent",
                    boxShadow: isActive ? `0 0 8px rgba(${r},${g},${b},0.3)` : "none",
                    opacity: isActive ? 1 : 0,
                  }}
                />

                <div
                  className="transition-all duration-500"
                  style={{ paddingLeft: isActive ? 20 : 0 }}
                >
                  <p
                    className="text-[11px] font-mono tracking-[0.4em] uppercase transition-colors duration-500"
                    style={{
                      color: isActive
                        ? `rgba(${r},${g},${b},0.8)`
                        : `rgba(${r},${g},${b},0.25)`,
                    }}
                  >
                    {block.label}
                  </p>

                  <div
                    className="overflow-hidden transition-all duration-700 ease-out"
                    style={{
                      maxHeight: isActive ? 200 : 0,
                      opacity: isActive ? 1 : 0,
                      marginTop: isActive ? 12 : 0,
                    }}
                  >
                    <p className="text-sm leading-7 text-zinc-300 font-light">
                      {block.value}
                    </p>
                  </div>
                </div>

                {/* Bottom separator */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{ backgroundColor: "rgba(39,39,42,0.3)" }}
                />
              </div>
            );
          })}

          {/* Commitment */}
          <div
            className={`mt-12 transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "1200ms" }}
          >
            <p
              className="text-[10px] font-mono tracking-[0.4em] uppercase mb-5"
              style={{ color: `rgba(${r},${g},${b},0.25)` }}
            >
              Commit
            </p>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Today I will..."
                className="flex-1 bg-transparent text-sm text-white outline-none border-b border-zinc-900 pb-2 placeholder:text-zinc-800 focus:border-zinc-700 transition-colors"
              />
              <button
                className="text-[10px] font-mono tracking-[0.3em] uppercase transition-colors duration-500 hover:text-white shrink-0"
                style={{ color: `rgba(${r},${g},${b},0.35)` }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
