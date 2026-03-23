"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateOrbit, resetOrbits, createDomain } from "./orrery-actions";
import { logout } from "@/lib/auth-actions";
import "./orrery.css";

/* ── Types ────────────────────────────────────────────────────── */

export type DomainData = {
  id: string;
  name: string;
  slug: string;
  status: "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED";
  identity: string | null;
  nextMove: string | null;
  primaryReason: string | null;
  positionX: number | null;
  color: string | null;
  autoDrifted: boolean;
};

type EffectiveStatus = "ACTIVE" | "DRIFTING" | "ARCHIVED";

function effectiveStatus(db: string): EffectiveStatus {
  if (db === "ARCHIVED") return "ARCHIVED";
  return db === "DRIFTING" ? "DRIFTING" : "ACTIVE";
}

/* ── Constants ────────────────────────────────────────────────── */

const MIN_ORBIT = 0.18;
const MAX_ORBIT = 0.82;
function getDefaultOrbit(i: number): number {
  // Spread orbits evenly across the range
  return MIN_ORBIT + ((i * 0.618) % 1) * (MAX_ORBIT - MIN_ORBIT);
}
function getOrbitSpeed(i: number): number {
  // Outer planets orbit slower, inner faster — seeded per index
  return 0.10 + (1 / (i + 1.5)) * 0.25;
}

function getInitialAngle(i: number): number {
  // Spread planets evenly with a golden-angle offset for variety
  return (i * 2.399) % (Math.PI * 2);
}
const DRAG_THRESHOLD = 10;

// Drifting planets live out here
const DRIFT_BASE_RADIUS = 0.94;
// Archived asteroids live even further out
const ARCHIVE_BASE_RADIUS = 1.25;

const DEFAULT_ACTIVE_COLOR = "#67e8f9";
const DEFAULT_DRIFTING_COLOR = "#f87171";
const DEFAULT_ARCHIVED_COLOR = "#71717a";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function buildGlow(hex: string, status: EffectiveStatus) {
  const { r, g, b } = hexToRgb(hex);
  if (status === "ARCHIVED") {
    return {
      color: hex,
      glow: `0 0 4px rgba(${r},${g},${b},0.3), 0 0 10px rgba(${r},${g},${b},0.1)`,
      glowSoft: `0 0 3px rgba(${r},${g},${b},0.2)`,
      ringColor: `rgba(${r},${g},${b},0.03)`,
      label: "Archived",
    };
  }
  const isDrifting = status === "DRIFTING";
  return {
    color: hex,
    glow: isDrifting
      ? `0 0 10px rgba(${r},${g},${b},0.8), 0 0 24px rgba(${r},${g},${b},0.4), 0 0 50px rgba(${r},${g},${b},0.15)`
      : `0 0 8px rgba(${r},${g},${b},0.9), 0 0 22px rgba(${r},${g},${b},0.5), 0 0 50px rgba(${r},${g},${b},0.15)`,
    glowSoft: `0 0 6px rgba(${r},${g},${b},0.4)`,
    ringColor: `rgba(${r},${g},${b},${isDrifting ? 0.06 : 0.10})`,
    label: isDrifting ? "Drifting" : "Active",
  };
}

function getDomainCfg(d: DomainData) {
  const es = effectiveStatus(d.status);
  const color = d.color ?? (
    es === "ARCHIVED" ? DEFAULT_ARCHIVED_COLOR :
    es === "DRIFTING" ? DEFAULT_DRIFTING_COLOR :
    DEFAULT_ACTIVE_COLOR
  );
  return buildGlow(color, es);
}

/* ── Starfield ────────────────────────────────────────────────── */

type Star = {
  x: number; y: number;
  size: number; opacity: number;
  twinkle: boolean;
  twinkleDuration: number;
  twinkleDelay: number;
  hue: string;
};

function generateStars(count: number): Star[] {
  const out: Star[] = [];
  for (let i = 0; i < count; i++) {
    const hueRoll = Math.random();
    out.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.4 + 0.4,
      opacity: Math.random() * 0.5 + 0.08,
      twinkle: Math.random() > 0.6,
      twinkleDuration: Math.random() * 4 + 3,
      twinkleDelay: Math.random() * 8,
      hue: hueRoll > 0.95 ? "#bfdbfe" : hueRoll > 0.90 ? "#fef9c3" : "#ffffff",
    });
  }
  return out;
}

/* ── Helpers ──────────────────────────────────────────────────── */

function validOrbit(v: number | null): number | null {
  if (v === null || v === undefined) return null;
  return v >= MIN_ORBIT && v <= MAX_ORBIT ? v : null;
}

const SUN_CORE = 18;
const MAX_PLANET = Math.round(SUN_CORE * 0.65); // ~12px — never rival the sun

function planetSize(normalizedRadius: number, status: EffectiveStatus): number {
  if (status === "ARCHIVED") return 4;
  if (status === "DRIFTING") return 6;
  // Active: closer → bigger, capped at MAX_PLANET
  return 7 + (1 - normalizedRadius / MAX_ORBIT) * (MAX_PLANET - 7);
}

/* ── Component ────────────────────────────────────────────────── */

type OrreryProps = {
  domains: DomainData[];
  isDemo?: boolean;
  isAdmin?: boolean;
  editingDemo?: boolean;
  demoUserId?: string;
};

type IndexedDomain = {
  domain: DomainData;
  index: number;
};

export function Orrery({ domains, isDemo = false, isAdmin = false, editingDemo = false, demoUserId }: OrreryProps) {
  const router = useRouter();
  const [stars, setStars] = useState<Star[]>([]);
  useEffect(() => { setStars(generateStars(220)); }, []);

  // Build domain URL (adds demoUser param when admin is editing demo)
  const domainUrl = useCallback((slug: string, extra?: string) => {
    const base = `/domain/${slug}`;
    const params = new URLSearchParams();
    if (editingDemo && demoUserId) params.set("demoUser", demoUserId);
    if (extra) {
      const extraParams = new URLSearchParams(extra);
      extraParams.forEach((value: string, key: string) => params.set(key, value));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }, [demoUserId, editingDemo]);

  // Create domain modal
  const [showCreate, setShowCreate] = useState(false);
  const [newDomainName, setNewDomainName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, startCreateTransition] = useTransition();

  const [radii, setRadii] = useState<number[]>(() => {
    let driftIdx = 0;
    let archiveIdx = 0;
    return domains.map((domain: DomainData, i: number) => {
      const es = effectiveStatus(domain.status);
      if (es === "ARCHIVED") return ARCHIVE_BASE_RADIUS + (archiveIdx++ * 0.04);
      if (es === "DRIFTING") return DRIFT_BASE_RADIUS + (driftIdx++ * 0.04);
      return validOrbit(domain.positionX) ?? getDefaultOrbit(i);
    });
  });
  const [dragging, setDragging] = useState<number | null>(null);
  const [randomizing, setRandomizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const armRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const anglesRef = useRef<number[]>(
    domains.map((_: DomainData, i: number) => getInitialAngle(i)),
  );
  const radiiRef = useRef<number[]>(radii);
  const sizeRef = useRef(700);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const draggingRef = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => { radiiRef.current = radii; }, [radii]);

  // Sync radii & angles when domains are added or removed
  useEffect(() => {
    if (domains.length !== radiiRef.current.length) {
      const newRadii = domains.map((domain: DomainData, i: number) => {
        // Keep existing values for domains we already have
        if (i < radiiRef.current.length) return radiiRef.current[i];
        const es = effectiveStatus(domain.status);
        if (es === "ARCHIVED") return ARCHIVE_BASE_RADIUS + Math.random() * 0.06;
        if (es === "DRIFTING") return DRIFT_BASE_RADIUS + Math.random() * 0.06;
        return MIN_ORBIT + Math.random() * (MAX_ORBIT - MIN_ORBIT);
      });
      const newAngles = domains.map((_: DomainData, i: number) => {
        if (i < anglesRef.current.length) return anglesRef.current[i];
        return Math.random() * Math.PI * 2;
      });
      radiiRef.current = newRadii;
      anglesRef.current = newAngles;
      setRadii(newRadii);
    }
  }, [domains]);

  /* Measure container */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => { sizeRef.current = el.offsetWidth; };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── Animation loop ──────────────────────────────────────── */

  useEffect(() => {
    const animate = (t: number) => {
      const dt = lastTRef.current ? (t - lastTRef.current) / 1000 : 0;
      lastTRef.current = t;
      const half = sizeRef.current / 2;

      // Compute positions for repulsion
      const positions: { x: number; y: number; es: EffectiveStatus }[] = [];
      for (let i = 0; i < domains.length; i++) {
        const r = radiiRef.current[i] * half;
        const a = anglesRef.current[i];
        positions.push({
          x: half + Math.cos(a) * r,
          y: half + Math.sin(a) * r,
          es: effectiveStatus(domains[i].status),
        });
      }

      for (let i = 0; i < domains.length; i++) {
        if (i === draggingRef.current) continue;

        const es = effectiveStatus(domains[i].status);

        // Gentle angular repulsion for drifting/archived to avoid label overlap
        if (es === "DRIFTING" || es === "ARCHIVED") {
          for (let j = 0; j < domains.length; j++) {
            if (i === j) continue;
            const jes = positions[j].es;
            if (jes !== "DRIFTING" && jes !== "ARCHIVED") continue;
            const dx = positions[i].x - positions[j].x;
            const dy = positions[i].y - positions[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = 60; // px threshold
            if (dist < minDist && dist > 0.1) {
              // Tiny nudge — just enough to slowly separate, not disrupt orbit
              const nudge = ((minDist - dist) / minDist) * 0.08 * dt;
              let angleDiff = anglesRef.current[i] - anglesRef.current[j];
              // Normalize to [-PI, PI]
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              anglesRef.current[i] += angleDiff >= 0 ? nudge : -nudge;
            }
          }
        }

        if (es === "ARCHIVED") {
          const wobbleR = Math.sin(t * 0.0005 + i * 3) * 0.01;
          anglesRef.current[i] += getOrbitSpeed(i) * 0.15 * dt;

          const archiveR = radiiRef.current[i] + wobbleR;
          const pxR = archiveR * half;

          const arm = armRefs.current[i];
          if (arm) {
            arm.style.width = `${pxR}px`;
            arm.style.transform = `rotate(${anglesRef.current[i]}rad)`;
            const counter = arm.querySelector<HTMLElement>("[data-counter]");
            if (counter) counter.style.transform = `rotate(${-anglesRef.current[i]}rad)`;
          }
          const ring = ringRefs.current[i];
          if (ring) {
            const d = pxR * 2;
            ring.style.width = `${d}px`;
            ring.style.height = `${d}px`;
            ring.style.top = `${half - pxR}px`;
            ring.style.left = `${half - pxR}px`;
          }
        } else if (es === "DRIFTING") {
          const wobbleR =
            Math.sin(t * 0.0013 + i * 2) * 0.035 +
            Math.sin(t * 0.0007 + i * 5) * 0.02;
          const speedMod =
            1 +
            Math.sin(t * 0.0009 + i) * 0.5 +
            Math.cos(t * 0.0017 + i * 3) * 0.3;
          anglesRef.current[i] += getOrbitSpeed(i) * 0.45 * speedMod * dt;

          const driftR = radiiRef.current[i] + wobbleR;
          const pxR = driftR * half;

          const arm = armRefs.current[i];
          if (arm) {
            arm.style.width = `${pxR}px`;
            arm.style.transform = `rotate(${anglesRef.current[i]}rad)`;
            const counter = arm.querySelector<HTMLElement>("[data-counter]");
            if (counter) counter.style.transform = `rotate(${-anglesRef.current[i]}rad)`;
          }
          const ring = ringRefs.current[i];
          if (ring) {
            const d = pxR * 2;
            ring.style.width = `${d}px`;
            ring.style.height = `${d}px`;
            ring.style.top = `${half - pxR}px`;
            ring.style.left = `${half - pxR}px`;
          }
        } else {
          // Normal orbit
          anglesRef.current[i] += getOrbitSpeed(i) * dt;
          const angle = anglesRef.current[i];
          const r = radiiRef.current[i];
          const pxR = r * half;

          const arm = armRefs.current[i];
          if (arm) {
            arm.style.width = `${pxR}px`;
            arm.style.transform = `rotate(${angle}rad)`;
            const counter = arm.querySelector<HTMLElement>("[data-counter]");
            if (counter) counter.style.transform = `rotate(${-angle}rad)`;
          }
          const ring = ringRefs.current[i];
          if (ring) {
            const d = pxR * 2;
            ring.style.width = `${d}px`;
            ring.style.height = `${d}px`;
            ring.style.top = `${half - pxR}px`;
            ring.style.left = `${half - pxR}px`;
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [domains]);

  /* ── Drag handlers ───────────────────────────────────────── */

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, idx: number) => {
      // Demo mode — redirect to login
      if (isDemo) { router.push("/login"); return; }
      // Drifting and archived planets can't be dragged — just navigate
      const es = effectiveStatus(domains[idx].status);
      if (es === "DRIFTING" || es === "ARCHIVED") {
        router.push(domainUrl(domains[idx].slug));
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = idx;
      setDragging(idx);
      hasDraggedRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      const onMove = (ev: PointerEvent) => {
        const dIdx = draggingRef.current;
        if (dIdx === null) return;

        const dx0 = ev.clientX - dragStartRef.current.x;
        const dy0 = ev.clientY - dragStartRef.current.y;
        if (!hasDraggedRef.current && Math.sqrt(dx0 * dx0 + dy0 * dy0) < DRAG_THRESHOLD) return;
        hasDraggedRef.current = true;

        const rect = containerRef.current!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = ev.clientX - cx;
        const dy = ev.clientY - cy;

        const half = sizeRef.current / 2;
        const pxR = Math.sqrt(dx * dx + dy * dy);
        const norm = Math.max(MIN_ORBIT, Math.min(MAX_ORBIT, pxR / half));
        const angle = Math.atan2(dy, dx);

        anglesRef.current[dIdx] = angle;
        radiiRef.current[dIdx] = norm;

        const arm = armRefs.current[dIdx];
        if (arm) {
          arm.style.width = `${norm * half}px`;
          arm.style.transform = `rotate(${angle}rad)`;
          const counter = arm.querySelector<HTMLElement>("[data-counter]");
          if (counter) counter.style.transform = `rotate(${-angle}rad)`;
        }
        const ring = ringRefs.current[dIdx];
        if (ring) {
          const d = norm * half * 2;
          ring.style.width = `${d}px`;
          ring.style.height = `${d}px`;
          ring.style.top = `${half - norm * half}px`;
          ring.style.left = `${half - norm * half}px`;
        }
      };

      const onUp = () => {
        const dIdx = draggingRef.current;
        draggingRef.current = null;
        setDragging(null);

        if (dIdx !== null) {
          if (hasDraggedRef.current) {
            const newR = radiiRef.current[dIdx];
            setRadii((prev) =>
              prev.map((radius: number, i: number) => (i === dIdx ? newR : radius)),
            );
            updateOrbit(
              domains[dIdx].id,
              newR,
              editingDemo ? demoUserId : undefined,
            );
          } else {
            router.push(isDemo ? "/login" : domainUrl(domains[dIdx].slug));
          }
        }
        hasDraggedRef.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [demoUserId, domainUrl, domains, editingDemo, isDemo, router],
  );

  /* ── Keyboard navigation (1–9) ──────────────────────────── */

  // Build sorted list of navigable (non-archived) domains by orbit proximity
  const navigable: IndexedDomain[] = domains
    .map(
      (domain: DomainData, index: number): IndexedDomain => ({ domain, index }),
    )
    .filter(
      ({ domain }: IndexedDomain) =>
        effectiveStatus(domain.status) !== "ARCHIVED",
    )
    .sort(
      (a: IndexedDomain, b: IndexedDomain) => radii[a.index] - radii[b.index],
    );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = parseInt(e.key, 10);
      if (key >= 1 && key <= 9) {
        const target = navigable[key - 1];
        if (target) {
          router.push(isDemo ? "/login" : domainUrl(target.domain.slug));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [domainUrl, isDemo, navigable, router]);

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden select-none">

      {/* ── Stars ──────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        {stars.map((star: Star, i: number) => (
          <span
            key={i}
            className={star.twinkle ? "star-twinkle" : undefined}
            style={{
              position: "absolute",
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              borderRadius: "50%",
              backgroundColor: star.hue,
              opacity: star.opacity,
              ["--twinkle-duration" as string]: `${star.twinkleDuration}s`,
              ["--twinkle-delay" as string]: `${star.twinkleDelay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Nebula clouds (boosted) ────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute rounded-full"
          style={{
            width: 800, height: 800,
            top: "-12%", right: "-18%",
            background: "radial-gradient(circle, rgba(103,232,249,0.07) 0%, rgba(103,232,249,0.02) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 900, height: 900,
            bottom: "-25%", left: "-12%",
            background: "radial-gradient(circle, rgba(252,211,77,0.05) 0%, rgba(252,211,77,0.015) 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600,
            top: "35%", left: "55%",
            background: "radial-gradient(circle, rgba(248,113,113,0.04) 0%, transparent 60%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* ── Vignette ───────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* ── Content ────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Header */}
        <header className="flex items-center justify-between px-5 md:px-12 py-4 md:py-6">
          <h1 className="text-[11px] font-mono tracking-[0.5em] uppercase flex items-center gap-3 md:gap-4">
            <span className="text-zinc-500">Axis</span>
            <span className="text-zinc-800 hidden sm:inline">|</span>
            <span className="text-zinc-700 tracking-[0.3em] text-[9px] hidden sm:inline">Yuvraj Kashyap</span>
          </h1>
          <div className="flex items-center gap-4 md:gap-6">
            {!isDemo && (
              <>
                {isAdmin && (
                  <Link
                    href={editingDemo ? "/" : "/?demo=edit"}
                    className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-800 hover:text-zinc-500 active:text-zinc-500 transition-colors duration-500"
                  >
                    {editingDemo ? "My orrery" : "Edit demo"}
                  </Link>
                )}
                <button
                  onClick={async () => { await logout(); router.push("/"); router.refresh(); }}
                  className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-800 hover:text-zinc-500 active:text-zinc-500 transition-colors duration-500"
                >
                  Log out
                </button>
                <button
                  onClick={() => { setShowCreate(true); setNewDomainName(""); setCreateError(""); }}
                  className="add-domain-btn w-7 h-7 rounded-full border border-zinc-800 text-zinc-700 transition-all duration-500"
                  title="Add domain"
                >
                  <svg width="100%" height="100%" viewBox="0 0 28 28" fill="none">
                    <line x1="14" y1="9" x2="14" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    <line x1="9" y1="14" x2="19" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                </button>
              </>
            )}
            {isDemo && (
              <Link
                href="/login"
                className="mr-8 md:mr-12 text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-700 hover:text-zinc-400 active:text-zinc-400 transition-colors duration-500"
              >
                Create an account / login
              </Link>
            )}
            <div className="hidden sm:flex flex-col items-end gap-1">
              <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-700">
                Open → Align → Execute
              </p>
              <Link
                href="/how"
                className="text-[8px] font-mono tracking-[0.3em] uppercase text-zinc-800 hover:text-zinc-500 active:text-zinc-500 transition-colors duration-500 border-b border-dashed border-zinc-800/40 hover:border-zinc-500/40 pb-px"
              >
                How does this work?
              </Link>
            </div>
          </div>
        </header>

        {/* Orrery */}
        <div className="flex-1 flex items-center justify-center px-2 md:px-4 py-2 md:py-4">
          <div
            ref={containerRef}
            className="relative"
            style={{
              width: "min(680px, 88vw, calc(100vh - 240px))",
              aspectRatio: "1",
            }}
          >
            {/* Orbit rings */}
            {domains.map((domain: DomainData, i: number) => {
              const es = effectiveStatus(domain.status);
              const cfg = getDomainCfg(domain);
              return (
                <div
                  key={`ring-${domain.id}`}
                  ref={(el) => { ringRefs.current[i] = el; }}
                  className={`absolute rounded-full orbit-ring-shimmer ${
                    es === "ARCHIVED" ? "border-dotted" : es === "DRIFTING" ? "border-dashed" : "border-solid"
                  }`}
                  style={{
                    borderWidth: es === "ARCHIVED" ? 0.5 : 1,
                    borderColor: cfg.ringColor,
                    ["--shimmer-duration" as string]: `${6 + i * 2}s`,
                    ["--shimmer-delay" as string]: `${i * 1.5}s`,
                    width: 0, height: 0,
                    transition: dragging === i ? "none" : "border-color 0.3s",
                  }}
                />
              );
            })}

            {/* ── SUN (clickable — randomizes orbits) ────── */}
            <button
              className="absolute cursor-pointer z-20"
              disabled={randomizing}
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "none", border: "none", padding: 0 }}
              onClick={async () => {
                if (isDemo) {
                  router.push("/login");
                  return;
                }

                setRandomizing(true);
                const newRadii = [...radiiRef.current];
                const newAngles = [...anglesRef.current];
                const updates: { id: string; radius: number }[] = [];

                domains.forEach((domain: DomainData, i: number) => {
                  const es = effectiveStatus(domain.status);
                  newAngles[i] = Math.random() * Math.PI * 2;
                  if (es === "ARCHIVED") {
                    const r = ARCHIVE_BASE_RADIUS + Math.random() * 0.08;
                    newRadii[i] = r;
                    return;
                  }
                  if (es === "DRIFTING") {
                    const r = DRIFT_BASE_RADIUS + (Math.random() * 0.06 - 0.03);
                    newRadii[i] = r;
                    return;
                  }
                  // Active: randomize orbit radius and angle
                  const r = MIN_ORBIT + Math.random() * (MAX_ORBIT - MIN_ORBIT);
                  newRadii[i] = r;
                  updates.push({ id: domain.id, radius: r });
                });

                radiiRef.current = newRadii;
                anglesRef.current = newAngles;
                setRadii(newRadii);

                await resetOrbits(
                  updates,
                  editingDemo ? demoUserId : undefined,
                );
                setRandomizing(false);
              }}
            >
              {/* Far glow — 240px, faintest */}
              <div
                className="absolute sun-outer-anim rounded-full"
                style={{
                  width: 240, height: 240,
                  top: -120, left: -120,
                  background: "radial-gradient(circle, rgba(254,243,199,0.06) 0%, rgba(103,232,249,0.02) 30%, transparent 65%)",
                  pointerEvents: "none",
                }}
              />
              {/* Outer halo — 160px */}
              <div
                className="absolute sun-mid-anim rounded-full"
                style={{
                  width: 160, height: 160,
                  top: -80, left: -80,
                  background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(254,243,199,0.05) 35%, transparent 65%)",
                  pointerEvents: "none",
                }}
              />
              {/* Inner halo — 70px */}
              <div
                className="absolute sun-inner-anim rounded-full"
                style={{
                  width: 70, height: 70,
                  top: -35, left: -35,
                  background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.08) 40%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />
              {/* Core — 18px solid circle */}
              <div
                className="sun-core-anim rounded-full"
                style={{
                  width: 18, height: 18,
                  marginLeft: -9, marginTop: -9,
                  backgroundColor: "#fff",
                  boxShadow:
                    "0 0 4px #fff, 0 0 10px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.5), 0 0 50px rgba(254,243,199,0.3), 0 0 90px rgba(103,232,249,0.12)",
                }}
              />
              {/* Label */}
              <span
                className="absolute whitespace-nowrap text-[9px] font-mono tracking-[0.5em] uppercase text-zinc-500"
                style={{ top: 26, left: "50%", transform: "translateX(-50%)" }}
              >
                AXIS
              </span>
            </button>

            {/* Tether line during drag */}
            {dragging !== null && (
              <div
                className="absolute bg-gradient-to-r from-white/20 to-white/5"
                style={{
                  top: "50%", left: "50%",
                  height: 1,
                  width: radii[dragging] * sizeRef.current / 2,
                  transformOrigin: "0 0",
                  transform: `rotate(${anglesRef.current[dragging]}rad)`,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Planet arms */}
            {domains.map((domain: DomainData, i: number) => {
              const es = effectiveStatus(domain.status);
              const cfg = getDomainCfg(domain);
              const isArchived = es === "ARCHIVED";
              const isDrifting = es === "DRIFTING";
              const isDraggingThis = dragging === i;
              const dot = planetSize(radii[i], es);
              return (
                <div
                  key={`arm-${domain.id}`}
                  ref={(el) => { armRefs.current[i] = el; }}
                  className="absolute"
                  style={{
                    top: "50%", left: "50%",
                    width: 0,
                    height: 0,
                    transformOrigin: "0px 0px",
                  }}
                >
                  <div
                    data-counter
                    className="absolute"
                    style={{
                      right: -(dot / 2),
                      top: -(dot / 2),
                      width: dot,
                      height: dot,
                    }}
                  >
                    {/* Hit area */}
                    <div
                      className={`absolute flex items-center justify-center ${isArchived || isDrifting ? "cursor-pointer" : "planet-grab"} ${isDraggingThis ? "z-50" : "z-10"}`}
                      style={{
                        top: -(22 - dot / 2),
                        left: -(22 - dot / 2),
                        width: dot + 44,
                        height: dot + 44,
                      }}
                      onPointerDown={(e) => handlePointerDown(e, i)}
                    >
                      {/* Halo */}
                      <div
                        className={`absolute rounded-full ${isDrifting ? "drift-glow" : isArchived ? "archive-drift" : ""}`}
                        style={{
                          width: dot * (isArchived ? 2.5 : isDrifting ? 5 : 3.5),
                          height: dot * (isArchived ? 2.5 : isDrifting ? 5 : 3.5),
                          background: `radial-gradient(circle, ${cfg.color}${isArchived ? "10" : isDrifting ? "20" : "15"} 0%, transparent 70%)`,
                          transition: "transform 0.3s",
                          transform: isDraggingThis ? "scale(1.8)" : "scale(1)",
                        }}
                      />
                      {/* Dot */}
                      <div
                        className={isArchived ? "asteroid-shape relative" : "rounded-full relative"}
                        style={{
                          width: dot,
                          height: dot,
                          backgroundColor: cfg.color,
                          boxShadow: cfg.glow,
                          opacity: isArchived ? 0.4 : 1,
                          transition: "transform 0.2s",
                          transform: isDraggingThis ? "scale(1.4)" : "scale(1)",
                        }}
                      />
                    </div>

                    {/* Label */}
                    <div
                      className="absolute whitespace-nowrap pointer-events-none"
                      style={{ top: dot + 16, left: "50%", transform: "translateX(-50%)" }}
                    >
                      <p
                        className="text-[10px] font-mono tracking-[0.2em] uppercase text-center transition-colors"
                        style={{
                          color: isArchived ? "rgba(113,113,122,0.4)" : isDrifting ? "#f87171" : isDraggingThis ? cfg.color : "rgba(161,161,170,0.7)",
                          textShadow: isDrifting ? "0 0 8px rgba(248,113,113,0.4)" : "none",
                        }}
                      >
                        {domain.name}
                      </p>
                      {(isDrifting || isArchived) && (
                        <p
                          className="text-[8px] font-mono tracking-widest uppercase text-center mt-0.5 transition-opacity"
                          style={{
                            color: isDrifting ? "rgba(248,113,113,0.5)" : cfg.color,
                            opacity: isArchived ? 0.25 : 0.7,
                          }}
                        >
                          {cfg.label}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-center pb-4 md:pb-5 px-5">
          <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-800 hidden md:block">
            Drag planets to adjust orbit · Click to enter · 1–9 to navigate
          </p>
          <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-800 md:hidden">
            Tap to enter · Drag to adjust
          </p>

          {(() => {
            const alignable: DomainData[] = domains.filter(
              (domain: DomainData) =>
                effectiveStatus(domain.status) !== "ARCHIVED",
            );
            if (alignable.length === 0) return null;
            const slugs = alignable
              .map((domain: DomainData) => domain.slug)
              .join(",");
            return (
              <Link
                href={isDemo ? "/login" : domainUrl(alignable[0].slug, `align=${encodeURIComponent(slugs)}&idx=0`)}
                className="absolute right-5 md:right-12 group text-[10px] font-mono tracking-[0.4em] uppercase"
              >
                <span className="text-zinc-600 group-hover:text-zinc-400 group-active:text-zinc-400 transition-colors duration-500">Align </span>
                <span className="text-zinc-700 group-hover:text-cyan-400 group-active:text-cyan-400 transition-colors duration-500 align-arrow">→</span>
              </Link>
            );
          })()}
        </div>
      </div>

      {/* Create domain modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div
            className="w-full max-w-md p-6 md:p-10 rounded-lg mx-4"
            style={{
              backgroundColor: "rgba(8,8,10,0.97)",
              border: "1px solid rgba(255,255,255,0.04)",
              boxShadow: "0 16px 64px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            <div className="text-center mb-10">
              <div className="w-2 h-2 rounded-full bg-zinc-700 mx-auto mb-6" />
              <h2
                className="text-2xl font-light tracking-tight text-zinc-200 mb-2"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                New Domain
              </h2>
              <p className="text-[9px] font-mono tracking-[0.4em] uppercase text-zinc-700">
                Add a new axis of alignment
              </p>
            </div>
            <input
              autoFocus
              type="text"
              value={newDomainName}
              onChange={(e) => { setNewDomainName(e.target.value); setCreateError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newDomainName.trim()) {
                  startCreateTransition(async () => {
                    const result = await createDomain(newDomainName, editingDemo ? demoUserId : undefined);
                    if (result.success) {
                      setShowCreate(false);
                      router.refresh();
                    } else {
                      setCreateError(result.error ?? "Failed to create domain.");
                    }
                  });
                }
                if (e.key === "Escape") setShowCreate(false);
              }}
              placeholder="Name this domain"
              className="w-full bg-transparent text-center text-xl font-light text-white outline-none border-b border-zinc-800/60 pb-4 placeholder:text-zinc-800 focus:border-zinc-600 transition-colors tracking-wide"
            />
            {createError && (
              <p className="mt-3 text-[10px] font-mono text-red-400/60 text-center">{createError}</p>
            )}
            <div className="mt-8 flex items-center justify-center gap-8">
              <button
                onClick={() => setShowCreate(false)}
                className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-700 hover:text-zinc-500 transition-colors duration-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newDomainName.trim()) return;
                  startCreateTransition(async () => {
                    const result = await createDomain(newDomainName, editingDemo ? demoUserId : undefined);
                    if (result.success) {
                      setShowCreate(false);
                      router.refresh();
                    } else {
                      setCreateError(result.error ?? "Failed to create domain.");
                    }
                  });
                }}
                disabled={isCreating || !newDomainName.trim()}
                className="text-[9px] font-mono tracking-[0.4em] uppercase text-zinc-500 hover:text-white transition-colors duration-500 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                {isCreating ? "Creating..." : "Create →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
