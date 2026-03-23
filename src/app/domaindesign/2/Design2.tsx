"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SampleDomain } from "../data";
import "./design2.css";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/*
 * Design 2: "Cards"
 * Planet hero → 3 floating cards (vision, reason, cost) in a row.
 * Cards are dim with just the label visible. Hover lifts the card,
 * brightens it, and reveals content. Commitment input fixed at bottom.
 */
export function Design2({ domain }: { domain: SampleDomain }) {
  const color = domain.color ?? "#67e8f9";
  const { r, g, b } = hexToRgb(color);
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const cards = [
    { label: "Vision", sub: "Where this leads", value: domain.vision },
    { label: "Reason", sub: "Why it matters", value: domain.primaryReason },
    { label: "Cost", sub: "Price of inaction", value: domain.primaryCost ?? domain.currentReality },
  ];

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute d2-glow rounded-full"
          style={{
            width: 600, height: 600,
            top: "5%", left: "50%",
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
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
          <div
            className={`d2-planet rounded-full mb-8 transition-all duration-1000 ${
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
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "600ms" }}
            >
              {domain.identity}
            </p>
          )}
        </div>

        {/* Cards */}
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card, i) => {
            const isHovered = hovered === i;
            const hasValue = !!card.value;
            return (
              <div
                key={card.label}
                className={`d2-card relative rounded-xl border transition-all duration-500 cursor-default ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{
                  transitionDelay: `${800 + i * 150}ms`,
                  borderColor: isHovered
                    ? `rgba(${r},${g},${b},0.2)`
                    : "rgba(39,39,42,0.5)",
                  transform: isHovered ? "translateY(-4px)" : undefined,
                  boxShadow: isHovered
                    ? `0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(${r},${g},${b},0.05)`
                    : "none",
                  background: isHovered
                    ? `linear-gradient(135deg, rgba(${r},${g},${b},0.03) 0%, rgba(0,0,0,0.9) 100%)`
                    : "rgba(9,9,11,0.6)",
                }}
                onMouseEnter={() => hasValue && setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="p-6">
                  {/* Top accent line */}
                  <div
                    className="w-6 h-px mb-5 transition-all duration-500"
                    style={{
                      backgroundColor: isHovered ? color : `rgba(${r},${g},${b},0.15)`,
                      boxShadow: isHovered ? `0 0 8px rgba(${r},${g},${b},0.3)` : "none",
                    }}
                  />

                  <p
                    className="text-[10px] font-mono tracking-[0.4em] uppercase transition-colors duration-500"
                    style={{
                      color: isHovered ? color : `rgba(${r},${g},${b},0.35)`,
                    }}
                  >
                    {card.label}
                  </p>
                  <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-700 mt-1">
                    {card.sub}
                  </p>

                  <div
                    className="overflow-hidden transition-all duration-500"
                    style={{
                      maxHeight: isHovered ? 200 : 0,
                      opacity: isHovered ? 1 : 0,
                      marginTop: isHovered ? 16 : 0,
                    }}
                  >
                    <p className="text-sm leading-7 text-zinc-300">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Commitment — centered below cards */}
        <div
          className={`max-w-md mx-auto px-8 mt-20 text-center transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "1200ms" }}
        >
          <input
            type="text"
            placeholder="Today I will..."
            className="w-full bg-transparent text-center text-base text-white outline-none border-b border-zinc-800 pb-3 placeholder:text-zinc-800 focus:border-zinc-600 transition-colors"
          />
          <button
            className="mt-5 text-[10px] font-mono tracking-[0.4em] uppercase transition-colors duration-500 hover:text-white"
            style={{ color: `rgba(${r},${g},${b},0.4)` }}
          >
            Commit →
          </button>
        </div>
      </div>
    </main>
  );
}
