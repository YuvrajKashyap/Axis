"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateOrbit, resetOrbits, createDomain } from "./orrery-actions";
import { logout } from "@/lib/auth-actions";
import {
  getEffectiveDriftThresholdMs,
  getOrbitEccentricityRatio,
  getOrbitSpeedMultiplier,
  getVisualIntensityMultiplier,
  normalizeDomainSettings,
  type DomainSettingsSnapshot,
} from "@/lib/domain-settings";
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
  lastCommitmentAt?: string | null;
  lastRelevantActivityAt?: string | null;
  settings?: DomainSettingsSnapshot;
};

type EffectiveStatus = "ACTIVE" | "DRIFTING" | "ARCHIVED";
type HoverMetric = EffectiveStatus | "TOTAL";

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
const RETURN_PULSE_START_DELAY_MS = 240;
const RETURN_PULSE_DURATION_MS = 4600;
const RETURN_PULSE_CLEAR_DELAY_MS = 420;
const RETURN_PULSE_ANIMATION = `${RETURN_PULSE_DURATION_MS / 1000}s cubic-bezier(0.22,1,0.36,1) 1`;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  switch (max) {
    case rr:
      h = (gg - bb) / d + (gg < bb ? 6 : 0);
      break;
    case gg:
      h = (bb - rr) / d + 2;
      break;
    default:
      h = (rr - gg) / d + 4;
      break;
  }

  h /= 6;
  return { h, s, l };
}

function hueToRgb(p: number, q: number, t: number) {
  let next = t;
  if (next < 0) next += 1;
  if (next > 1) next -= 1;
  if (next < 1 / 6) return p + (q - p) * 6 * next;
  if (next < 1 / 2) return q;
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number) {
  if (s === 0) {
    const value = Math.round(l * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${value}${value}${value}`;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);

  return `#${[r, g, b]
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function tuneHexColor(
  hex: string,
  saturationMultiplier: number,
  lightnessMultiplier: number,
  lightnessOffset: number = 0,
) {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  return hslToHex(
    hsl.h,
    Math.max(0, Math.min(1, hsl.s * saturationMultiplier)),
    Math.max(0, Math.min(1, hsl.l * lightnessMultiplier + lightnessOffset)),
  );
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
    ringColor: `rgba(${r},${g},${b},${isDrifting ? 0.036 : 0.06})`,
    label: isDrifting ? "Drifting" : "Active",
  };
}

function clampAlpha(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function rgba(r: number, g: number, b: number, alpha: number) {
  return `rgba(${r},${g},${b},${clampAlpha(alpha)})`;
}

function getOrbitPosition(
  semiMajorRadiusPx: number,
  angle: number,
  eccentricityRatio: number,
) {
  const x = Math.cos(angle) * semiMajorRadiusPx;
  const y = Math.sin(angle) * semiMajorRadiusPx * eccentricityRatio;

  return {
    x,
    y,
    orbitalRadiusPx: Math.sqrt(x * x + y * y),
  };
}

function getEllipseRingFrame(radius: number, eccentricityRatio: number) {
  const semiMajor = radius * 50;
  const semiMinor = semiMajor * eccentricityRatio;

  return {
    widthPercent: radius * 100,
    heightPercent: radius * 100 * eccentricityRatio,
    leftPercent: 50 - semiMajor,
    topPercent: 50 - semiMinor,
  };
}

function buildGlowWithIntensity(
  hex: string,
  status: EffectiveStatus,
  intensityMultiplier: number,
) {
  const baseCfg = buildGlow(hex, status);
  if (intensityMultiplier === 1) {
    return baseCfg;
  }

  const isSubtle = intensityMultiplier < 1;
  const isIntense = intensityMultiplier > 1;
  const saturationMultiplier = isSubtle
    ? 0.88
    : isIntense
      ? 2.25
      : 1;
  const lightnessMultiplier = isSubtle
    ? 0.98
    : isIntense
      ? 1.04
      : 1;
  const lightnessOffset = isIntense ? 0.015 : 0;
  const tunedColor = tuneHexColor(
    hex,
    saturationMultiplier,
    lightnessMultiplier,
    lightnessOffset,
  );
  const { r, g, b } = hexToRgb(tunedColor);
  const spreadScale = isSubtle ? 0.82 : isIntense ? 1.25 : 1;
  const alphaScale = isSubtle ? 0.78 : isIntense ? 1.2 : 1;

  if (status === "ARCHIVED") {
    if (isIntense) {
      return {
        color: tunedColor,
        glow: `0 0 6px ${rgba(r, g, b, 0.96)}, 0 0 12px ${rgba(r, g, b, 0.78)}, 0 0 18px ${rgba(r, g, b, 0.42)}`,
        glowSoft: `0 0 8px ${rgba(r, g, b, 0.28)}`,
        ringColor: baseCfg.ringColor,
        label: baseCfg.label,
      };
    }

    return {
      color: tunedColor,
      glow: `0 0 ${4 * spreadScale}px ${rgba(r, g, b, 0.3 * alphaScale)}, 0 0 ${10 * spreadScale}px ${rgba(r, g, b, 0.1 * alphaScale)}`,
      glowSoft: `0 0 ${3 * spreadScale}px ${rgba(r, g, b, 0.2 * alphaScale)}`,
      ringColor: baseCfg.ringColor,
      label: baseCfg.label,
    };
  }

  const isDrifting = status === "DRIFTING";
  const primaryAlpha = isDrifting ? 0.8 : 0.9;
  const secondaryAlpha = isDrifting ? 0.4 : 0.5;
  const tertiaryAlpha = 0.15;

  if (isIntense) {
    return {
      color: tunedColor,
      glow: isDrifting
        ? `0 0 10px ${rgba(r, g, b, 1)}, 0 0 18px ${rgba(r, g, b, 0.96)}, 0 0 30px ${rgba(r, g, b, 0.72)}, 0 0 46px ${rgba(r, g, b, 0.24)}`
        : `0 0 10px ${rgba(r, g, b, 1)}, 0 0 18px ${rgba(r, g, b, 0.98)}, 0 0 30px ${rgba(r, g, b, 0.76)}, 0 0 48px ${rgba(r, g, b, 0.26)}`,
      glowSoft: `0 0 8px ${rgba(r, g, b, 0.5)}, 0 0 14px ${rgba(r, g, b, 0.18)}`,
      ringColor: baseCfg.ringColor,
      label: baseCfg.label,
    };
  }

  return {
    color: tunedColor,
    glow: `0 0 ${8 * spreadScale}px ${rgba(r, g, b, primaryAlpha * alphaScale)}, 0 0 ${22 * spreadScale}px ${rgba(r, g, b, secondaryAlpha * alphaScale)}, 0 0 ${50 * spreadScale}px ${rgba(r, g, b, tertiaryAlpha * alphaScale)}`,
    glowSoft: `0 0 ${6 * spreadScale}px ${rgba(r, g, b, 0.4 * alphaScale)}`,
    ringColor: baseCfg.ringColor,
    label: baseCfg.label,
  };
}

function getNormalizedSettings(domain: DomainData): DomainSettingsSnapshot {
  return normalizeDomainSettings(domain.settings);
}

function getDomainCfg(d: DomainData) {
  const es = effectiveStatus(d.status);
  const settings = getNormalizedSettings(d);
  const color = d.color ?? (
    es === "ARCHIVED" ? DEFAULT_ARCHIVED_COLOR :
    es === "DRIFTING" ? DEFAULT_DRIFTING_COLOR :
    DEFAULT_ACTIVE_COLOR
  );
  return buildGlowWithIntensity(
    color,
    es,
    getVisualIntensityMultiplier(settings.visualIntensity),
  );
}

function matchesHoverMetric(metric: HoverMetric | null, status: EffectiveStatus): boolean {
  if (!metric) return false;
  if (metric === "TOTAL") return true;
  return metric === status;
}

function formatDriftCountdown(remainingMs: number | null): string {
  if (remainingMs === null) return "--h --m --s";
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function driftCountdownTone(remainingMs: number | null): string {
  if (remainingMs === null) return "rgba(161,161,170,0.75)";
  if (remainingMs <= 6 * 60 * 60 * 1000) return "#fca5a5";
  if (remainingMs <= 24 * 60 * 60 * 1000) return "#fcd34d";
  return "rgba(228,228,231,0.88)";
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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']") !== null;
}

const SUN_CORE = 18;
const MAX_PLANET = Math.round(SUN_CORE * 0.65); // ~12px — never rival the sun
const MAX_PLANET_SCALE_CAP = SUN_CORE * 0.7;

function planetSize(
  normalizedRadius: number,
  status: EffectiveStatus,
  sizeScale: number,
): number {
  const scaled = (base: number) => {
    if (status === "ACTIVE") {
      return Math.min(MAX_PLANET_SCALE_CAP, base * sizeScale);
    }
    return Math.max(1.8, base * sizeScale);
  };

  if (status === "DRIFTING") return scaled(6);
  if (status === "ARCHIVED") return scaled(4);
  // Active: closer → bigger, capped at MAX_PLANET
  return scaled(7 + (1 - normalizedRadius / MAX_ORBIT) * (MAX_PLANET - 7));
}

/* ── Component ────────────────────────────────────────────────── */

type OrreryProps = {
  domains: DomainData[];
  isDemo?: boolean;
  isAdmin?: boolean;
  editingDemo?: boolean;
  demoUserId?: string;
  returnPulseDomainId?: string | null;
};

type IndexedDomain = {
  domain: DomainData;
  index: number;
};

export function Orrery({
  domains,
  isDemo = false,
  isAdmin = false,
  editingDemo = false,
  demoUserId,
  returnPulseDomainId = null,
}: OrreryProps) {
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
  const [hoveredMetric, setHoveredMetric] = useState<HoverMetric | null>(null);
  const [hoveredCountdownDomainId, setHoveredCountdownDomainId] = useState<string | null>(null);
  const [orbitClockOpen, setOrbitClockOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [returnPulseActive, setReturnPulseActive] = useState(false);
  const [returnPulseTargetId, setReturnPulseTargetId] = useState<string | null>(null);
  const showCreateRef = useRef(showCreate);
  const orbitClockDesktopScrollRef = useRef<HTMLDivElement>(null);
  const orbitClockMobileScrollRef = useRef<HTMLDivElement>(null);
  showCreateRef.current = showCreate;

  const normalizedSettings = useMemo(
    () => domains.map((domain: DomainData) => getNormalizedSettings(domain)),
    [domains],
  );

  const openOrbitClock = useCallback(() => setOrbitClockOpen(true), []);
  const closeOrbitClock = useCallback(() => {
    setOrbitClockOpen(false);
    setHoveredCountdownDomainId(null);
  }, []);
  const toggleOrbitClock = useCallback(() => {
    setOrbitClockOpen((open) => {
      const next = !open;
      if (!next) {
        setHoveredCountdownDomainId(null);
      }
      return next;
    });
  }, []);

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
  const moverRefs = useRef<(HTMLDivElement | null)[]>([]);
  const counterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ringRefs = useRef<(SVGSVGElement | null)[]>([]);
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

  useEffect(() => {
    if (isDemo || editingDemo) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [editingDemo, isDemo]);

  useEffect(() => {
    if (!orbitClockOpen) return;
    orbitClockDesktopScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    orbitClockMobileScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [orbitClockOpen]);

  useEffect(() => {
    if (!returnPulseDomainId) return;

    setReturnPulseTargetId(returnPulseDomainId);
    setReturnPulseActive(false);

    const startTimer = window.setTimeout(() => {
      setReturnPulseActive(true);
    }, RETURN_PULSE_START_DELAY_MS);

    const fadeTimer = window.setTimeout(() => {
      setReturnPulseActive(false);
    }, RETURN_PULSE_START_DELAY_MS + RETURN_PULSE_DURATION_MS);
    const clearTimer = window.setTimeout(() => {
      setReturnPulseTargetId(null);
    }, RETURN_PULSE_START_DELAY_MS + RETURN_PULSE_DURATION_MS + RETURN_PULSE_CLEAR_DELAY_MS);
    const cleanupUrlTimer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("pulseDomain")) return;
      url.searchParams.delete("pulseDomain");
      const query = url.searchParams.toString();
      router.replace(query ? `${url.pathname}?${query}` : url.pathname, {
        scroll: false,
      });
    }, RETURN_PULSE_START_DELAY_MS + RETURN_PULSE_DURATION_MS + 220);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
      window.clearTimeout(cleanupUrlTimer);
    };
  }, [returnPulseDomainId, router]);

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

  const setPlanetTransforms = useCallback((
    index: number,
    radius: number,
    angle: number,
    eccentricityRatio: number = 1,
  ) => {
    const semiMajorRadiusPx = radius * (sizeRef.current / 2);
    const { x, y } = getOrbitPosition(
      semiMajorRadiusPx,
      angle,
      eccentricityRatio,
    );

    const arm = armRefs.current[index];
    if (arm) {
      arm.style.transform = "translate3d(0, 0, 0)";
    }

    const mover = moverRefs.current[index];
    if (mover) {
      mover.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    const counter = counterRefs.current[index];
    if (counter) {
      counter.style.transform = "rotate(0deg)";
    }
  }, []);

  const setRingRadius = useCallback((
    index: number,
    radius: number,
    eccentricityRatio: number = 1,
  ) => {
    const ring = ringRefs.current[index];
    if (!ring) return;

    const frame = getEllipseRingFrame(radius, eccentricityRatio);
    ring.style.width = `${frame.widthPercent}%`;
    ring.style.height = `${frame.heightPercent}%`;
    ring.style.top = `${frame.topPercent}%`;
    ring.style.left = `${frame.leftPercent}%`;
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
        const semiMajorRadiusPx = radiiRef.current[i] * half;
        const a = anglesRef.current[i];
        const es = effectiveStatus(domains[i].status);
        const eccentricityRatio =
          es === "ACTIVE"
            ? getOrbitEccentricityRatio(normalizedSettings[i].orbitEccentricity)
            : 1;
        const orbitPoint = getOrbitPosition(
          semiMajorRadiusPx,
          a,
          eccentricityRatio,
        );
        positions.push({
          x: half + orbitPoint.x,
          y: half + orbitPoint.y,
          es,
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
          setPlanetTransforms(i, radiiRef.current[i] + wobbleR, anglesRef.current[i]);
        } else if (es === "DRIFTING") {
          const wobbleR =
            Math.sin(t * 0.0013 + i * 2) * 0.035 +
            Math.sin(t * 0.0007 + i * 5) * 0.02;
          const speedMod =
            1 +
            Math.sin(t * 0.0009 + i) * 0.5 +
            Math.cos(t * 0.0017 + i * 3) * 0.3;
          anglesRef.current[i] += getOrbitSpeed(i) * 0.45 * speedMod * dt;
          setPlanetTransforms(i, radiiRef.current[i] + wobbleR, anglesRef.current[i]);
        } else {
          // Normal orbit
          const orbitSpeedMultiplier = getOrbitSpeedMultiplier(
            normalizedSettings[i].orbitSpeed,
          );
          const eccentricityRatio = getOrbitEccentricityRatio(
            normalizedSettings[i].orbitEccentricity,
          );
          anglesRef.current[i] += getOrbitSpeed(i) * orbitSpeedMultiplier * dt;
          setPlanetTransforms(
            i,
            radiiRef.current[i],
            anglesRef.current[i],
            eccentricityRatio,
          );
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [domains, normalizedSettings, setPlanetTransforms]);

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
        const eccentricityRatio = getOrbitEccentricityRatio(
          normalizedSettings[dIdx].orbitEccentricity,
        );

        const half = sizeRef.current / 2;
        const semiMajorRadiusPx = Math.sqrt(
          dx * dx + (dy / eccentricityRatio) * (dy / eccentricityRatio),
        );
        const angle = Math.atan2(dy / eccentricityRatio, dx);
        const norm = Math.max(
          MIN_ORBIT,
          Math.min(MAX_ORBIT, semiMajorRadiusPx / half),
        );

        anglesRef.current[dIdx] = angle;
        radiiRef.current[dIdx] = norm;
        setPlanetTransforms(dIdx, norm, angle, eccentricityRatio);
        setRingRadius(dIdx, norm, eccentricityRatio);
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
    [
      demoUserId,
      domainUrl,
      domains,
      editingDemo,
      isDemo,
      normalizedSettings,
      router,
      setPlanetTransforms,
      setRingRadius,
    ],
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
  const orbitingCount = domains.filter(
    (domain: DomainData) => effectiveStatus(domain.status) === "ACTIVE",
  ).length;
  const driftingCount = domains.filter(
    (domain: DomainData) => effectiveStatus(domain.status) === "DRIFTING",
  ).length;
  const archivedCount = domains.filter(
    (domain: DomainData) => effectiveStatus(domain.status) === "ARCHIVED",
  ).length;
  const totalCount = domains.length;
  const showDriftCountdownWidget = !isDemo && !editingDemo;
  const activeCountdowns = domains
    .map((domain: DomainData, index: number) => ({
      domain,
      settings: normalizedSettings[index],
    }))
    .filter(
      ({ domain }: { domain: DomainData; settings: DomainSettingsSnapshot }) =>
        effectiveStatus(domain.status) === "ACTIVE",
    )
    .map(({ domain, settings }: { domain: DomainData; settings: DomainSettingsSnapshot }) => {
      const driftThresholdMs = getEffectiveDriftThresholdMs(settings);
      const lastRelevantActivityMs = domain.lastRelevantActivityAt
        ? new Date(domain.lastRelevantActivityAt).getTime()
        : null;
      const driftDisabled = driftThresholdMs === null;
      const remainingMs =
        driftDisabled || lastRelevantActivityMs === null || driftThresholdMs === null
          ? null
          : Math.max(0, lastRelevantActivityMs + driftThresholdMs - nowMs);
      return {
        domain,
        driftDisabled,
        remainingMs,
        tone: driftDisabled ? "#67e8f9" : driftCountdownTone(remainingMs),
        formatted: driftDisabled ? "DEACTIVATED DRIFT" : formatDriftCountdown(remainingMs),
      };
    })
    .sort((a, b) => {
      if (a.driftDisabled && b.driftDisabled) return a.domain.name.localeCompare(b.domain.name);
      if (a.driftDisabled) return 1;
      if (b.driftDisabled) return -1;
      if (a.remainingMs === null && b.remainingMs === null) return a.domain.name.localeCompare(b.domain.name);
      if (a.remainingMs === null) return 1;
      if (b.remainingMs === null) return -1;
      return a.remainingMs - b.remainingMs;
    });
  const orbitClockClosedSize = 49;
  const orbitClockExpandedHeight = Math.min(456, 176 + Math.min(activeCountdowns.length, 6) * 48);
  const orbitClockHeight = orbitClockOpen ? orbitClockExpandedHeight : orbitClockClosedSize;
  const orbitClockWidth = orbitClockOpen ? 376 : orbitClockClosedSize;
  const orbitClockMobileClosedSize = 32;
  const orbitClockMobileHeight = orbitClockOpen
    ? Math.min(360, 156 + Math.min(activeCountdowns.length, 5) * 42)
    : orbitClockMobileClosedSize;
  const orbitClockMobileWidth = orbitClockOpen
    ? "min(18.5rem, calc(100vw - 0.75rem))"
    : orbitClockMobileClosedSize;
  const alignable: DomainData[] = domains.filter(
    (domain: DomainData) => effectiveStatus(domain.status) !== "ARCHIVED",
  );
  const alignSlugs = alignable
    .map((domain: DomainData) => domain.slug)
    .join(",");
  const footerStats: { key: HoverMetric; count: number; label: string }[] = [
    { key: "ACTIVE", count: orbitingCount, label: "planets in orbit" },
    { key: "DRIFTING", count: driftingCount, label: "planets drifting" },
    { key: "ARCHIVED", count: archivedCount, label: "planets archived" },
    { key: "TOTAL", count: totalCount, label: "planets total" },
  ];
  const countSlotWidthCh = Math.max(
    2,
    ...footerStats.map((stat) => String(stat.count).length),
  ) + 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        showCreateRef.current ||
        e.defaultPrevented ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        isEditableTarget(e.target)
      ) {
        return;
      }

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
        <header className="relative z-30 flex items-center justify-between px-5 md:px-12 py-4 md:py-6">
          <h1 className="text-[11px] font-mono tracking-[0.5em] uppercase flex items-center gap-3 md:gap-4">
            <span className="text-zinc-400">Axis</span>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <span className="text-zinc-500 tracking-[0.3em] text-[9px] hidden sm:inline">Yuvraj Kashyap</span>
          </h1>
          <div className="flex items-center gap-4 md:gap-6">
            {!isDemo && (
              <>
                {isAdmin && (
                  <Link
                    href={editingDemo ? "/" : "/?demo=edit"}
                    className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-600 hover:text-zinc-300 active:text-zinc-300 transition-colors duration-500"
                  >
                    {editingDemo ? "My orrery" : "Edit demo"}
                  </Link>
                )}
                <button
                  onClick={async () => { await logout(); router.push("/"); router.refresh(); }}
                  className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-600 hover:text-zinc-300 active:text-zinc-300 transition-colors duration-500"
                >
                  Log out
                </button>
                <button
                  onClick={() => { setShowCreate(true); setNewDomainName(""); setCreateError(""); }}
                  className="add-domain-btn w-7 h-7 rounded-full border border-zinc-700 text-zinc-500 transition-all duration-500"
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
                className="mr-8 md:mr-12 text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 hover:text-zinc-200 active:text-zinc-200 transition-colors duration-500"
              >
                Create an account / login
              </Link>
            )}
            <div className="hidden sm:flex flex-col items-end gap-1">
              <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-500">
                Open → Align → Execute
              </p>
              <Link
                href="/how"
                className="group inline-flex items-center gap-2 text-[8px] font-mono tracking-[0.32em] uppercase text-zinc-400 hover:text-zinc-200 active:text-zinc-200 transition-colors duration-500 border-b border-dashed border-zinc-400/55 hover:border-zinc-200/55 pb-px"
              >
                <span aria-hidden className="h-1 w-1 rounded-full bg-zinc-400/80 transition-colors duration-500 group-hover:bg-zinc-200/80" />
                <span>How does this work?</span>
                <span aria-hidden className="text-zinc-600 transition-colors duration-500 group-hover:text-zinc-300">↗</span>
              </Link>
            </div>
          </div>
        </header>

        {showDriftCountdownWidget && (
          <div className="pointer-events-none fixed right-10 top-1/2 z-30 hidden -translate-y-1/2 lg:block xl:right-14">
            <div
              onPointerEnter={openOrbitClock}
              onPointerLeave={closeOrbitClock}
              className={`orbit-clock-shell pointer-events-auto relative transform-gpu transition-[width,height,border-radius,box-shadow,border-color,background-color] duration-[820ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${orbitClockOpen ? "orbit-clock-shell-open overflow-hidden" : "overflow-visible"}`}
              style={{
                width: orbitClockWidth,
                height: orbitClockHeight,
                borderRadius: orbitClockOpen ? 36 : 999,
                willChange: "width, height, border-radius, box-shadow",
              }}
            >
              <div className="orbit-clock-sheen" />

              <div
                className="absolute left-1/2 top-1/2 h-28 w-28 transform-gpu transition-[opacity,transform] duration-[720ms] ease-[cubic-bezier(0.19,1,0.22,1)]"
                style={{
                  opacity: orbitClockOpen ? 0 : 1,
                  transform: `translate(-50%, -50%) scale(${orbitClockOpen ? 0.56 : 0.46})`,
                  willChange: "transform, opacity",
                }}
              >
                <div className="relative flex h-full w-full items-center justify-center">
                  <div className="orbit-clock-ring orbit-clock-ring-a" />
                  <div className="orbit-clock-ring orbit-clock-ring-b" />
                  <div className="orbit-clock-ring orbit-clock-ring-c" />
                </div>
              </div>

              <div
                className={`absolute inset-0 flex transform-gpu transition-[opacity,transform] duration-[760ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${orbitClockOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0"}`}
                style={{ willChange: "transform, opacity" }}
              >
                <div className="relative flex w-[118px] shrink-0 items-center justify-center">
                  <div className="orbit-clock-ring orbit-clock-ring-a orbit-clock-ring-open" />
                  <div className="orbit-clock-ring orbit-clock-ring-b orbit-clock-ring-open" />
                  <div className="orbit-clock-ring orbit-clock-ring-c orbit-clock-ring-open" />
                  <div className="orbit-clock-core orbit-clock-core-open orbit-clock-core-countonly">
                    <p className="orbit-clock-core-value orbit-clock-core-value-solo">{orbitingCount}</p>
                  </div>
                </div>

                  <div className="flex min-w-0 min-h-0 flex-1 flex-col py-5 pl-1 pr-5">
                  <div className="border-b border-white/[0.06] pb-3">
                    <p className="orbit-clock-title text-center text-[9px] font-mono uppercase">
                      countdown till drift
                    </p>
                  </div>

                  {activeCountdowns.length > 0 ? (
                    <div
                      ref={orbitClockDesktopScrollRef}
                      className="orbit-clock-scroll mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
                    >
                      {activeCountdowns.map((item) => {
                        const cfg = getDomainCfg(item.domain);
                        const isRowHovered = hoveredCountdownDomainId === item.domain.id;
                        return (
                          <div
                            key={item.domain.id}
                            onPointerEnter={() => setHoveredCountdownDomainId(item.domain.id)}
                            onPointerLeave={() => setHoveredCountdownDomainId(null)}
                            className="group/clockrow flex items-center justify-between gap-4 rounded-[22px] border border-white/[0.04] bg-black/20 px-4 py-3 transition-all duration-300"
                            style={{
                              borderColor: isRowHovered ? `${cfg.color}40` : undefined,
                              backgroundColor: isRowHovered ? "rgba(255,255,255,0.045)" : undefined,
                              boxShadow: isRowHovered ? `0 0 24px ${cfg.color}14` : "none",
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: cfg.color,
                                  boxShadow: `0 0 10px ${cfg.color}55`,
                                }}
                              />
                              <span className="truncate text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-200">
                                {item.domain.name}
                              </span>
                            </div>
                            <span
                              className="shrink-0 tabular-nums text-[10px] font-mono uppercase tracking-[0.16em] transition-colors duration-300"
                              style={{ color: isRowHovered ? cfg.color : item.tone }}
                            >
                              {item.formatted}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-6 text-center">
                      <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-700">
                        no planets are active right now
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showDriftCountdownWidget && (
          <div className="pointer-events-none fixed right-2 top-1/2 z-30 -translate-y-1/2 lg:hidden">
            <div
              className={`orbit-clock-shell pointer-events-auto relative transform-gpu transition-[width,height,border-radius,box-shadow,border-color,background-color] duration-[820ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${orbitClockOpen ? "orbit-clock-shell-open overflow-hidden" : "overflow-visible"}`}
              style={{
                width: orbitClockMobileWidth,
                height: orbitClockMobileHeight,
                borderRadius: orbitClockOpen ? 28 : 999,
                willChange: "width, height, border-radius, box-shadow",
              }}
            >
              <div className="orbit-clock-sheen" />

              <button
                type="button"
                onClick={toggleOrbitClock}
                aria-expanded={orbitClockOpen}
                aria-label={orbitClockOpen ? "Collapse drift countdown" : "Expand drift countdown"}
                className={`absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 bg-transparent p-0 transform-gpu transition-[opacity,transform] duration-[720ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${orbitClockOpen ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"}`}
                style={{
                  transform: `translate(-50%, -50%) scale(${orbitClockOpen ? 0.36 : 0.32})`,
                  willChange: "transform, opacity",
                }}
              >
                <div className="relative flex h-full w-full items-center justify-center">
                  <div className="orbit-clock-ring orbit-clock-ring-a" />
                  <div className="orbit-clock-ring orbit-clock-ring-b" />
                  <div className="orbit-clock-ring orbit-clock-ring-c" />
                </div>
              </button>

              <div
                className={`absolute inset-0 flex transform-gpu transition-[opacity,transform] duration-[760ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${orbitClockOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0"}`}
                style={{ willChange: "transform, opacity" }}
              >
                <button
                  type="button"
                  onClick={toggleOrbitClock}
                  aria-label="Collapse drift countdown"
                  className="relative flex w-[82px] shrink-0 items-center justify-center bg-transparent p-0"
                >
                  <div className="orbit-clock-ring orbit-clock-ring-a orbit-clock-ring-open" />
                  <div className="orbit-clock-ring orbit-clock-ring-b orbit-clock-ring-open" />
                  <div className="orbit-clock-ring orbit-clock-ring-c orbit-clock-ring-open" />
                  <div className="orbit-clock-core orbit-clock-core-open orbit-clock-core-countonly">
                    <p className="orbit-clock-core-value orbit-clock-core-value-solo">{orbitingCount}</p>
                  </div>
                </button>

                <div className="flex min-w-0 min-h-0 flex-1 flex-col py-4 pl-0 pr-4">
                  <div className="border-b border-white/[0.06] pb-3">
                    <p className="orbit-clock-title text-center text-[8px] font-mono uppercase">
                      countdown till drift
                    </p>
                  </div>

                  {activeCountdowns.length > 0 ? (
                    <div
                      ref={orbitClockMobileScrollRef}
                      className="orbit-clock-scroll mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
                    >
                      {activeCountdowns.map((item) => {
                        const cfg = getDomainCfg(item.domain);
                        const isRowHovered = hoveredCountdownDomainId === item.domain.id;
                        return (
                          <div
                            key={`mobile-${item.domain.id}`}
                            onPointerEnter={() => setHoveredCountdownDomainId(item.domain.id)}
                            onPointerLeave={() => setHoveredCountdownDomainId(null)}
                            className="flex items-center justify-between gap-3 rounded-[18px] border border-white/[0.04] bg-black/20 px-3 py-2.5 transition-all duration-300"
                            style={{
                              borderColor: isRowHovered ? `${cfg.color}40` : undefined,
                              backgroundColor: isRowHovered ? "rgba(255,255,255,0.045)" : undefined,
                              boxShadow: isRowHovered ? `0 0 20px ${cfg.color}14` : "none",
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: cfg.color,
                                  boxShadow: `0 0 8px ${cfg.color}55`,
                                }}
                              />
                              <span className="truncate text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-200">
                                {item.domain.name}
                              </span>
                            </div>
                            <span
                              className="shrink-0 tabular-nums text-[9px] font-mono uppercase tracking-[0.12em] transition-colors duration-300"
                              style={{ color: isRowHovered ? cfg.color : item.tone }}
                            >
                              {item.formatted}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-4 text-center">
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-700">
                        no planets are active right now
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orrery */}
        <div className="flex-1 flex items-center justify-center px-2 md:px-4 py-2 md:py-4">
          <div
            ref={containerRef}
            className="relative z-0"
            style={{
              width: "min(680px, 88vw, calc(100vh - 240px))",
              aspectRatio: "1",
            }}
          >
            {/* Orbit rings */}
            {domains.map((domain: DomainData, i: number) => {
              const es = effectiveStatus(domain.status);
              const cfg = getDomainCfg(domain);
              const settings = normalizedSettings[i];
              const eccentricityRatio =
                es === "ACTIVE"
                  ? getOrbitEccentricityRatio(settings.orbitEccentricity)
                  : 1;
              const ringFrame = getEllipseRingFrame(radii[i], eccentricityRatio);
              const isPulseFocus =
                returnPulseActive && returnPulseTargetId === domain.id;
              const isDimmedByPulse = returnPulseActive && !isPulseFocus;
              const { r, g, b } = hexToRgb(cfg.color);
              return (
                <svg
                  key={`ring-${domain.id}`}
                  ref={(el) => { ringRefs.current[i] = el; }}
                  className="absolute orbit-ring-shimmer"
                  aria-hidden
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{
                    ["--shimmer-duration" as string]: `${6 + i * 2}s`,
                    ["--shimmer-delay" as string]: `${i * 1.5}s`,
                    width: `${ringFrame.widthPercent}%`,
                    height: `${ringFrame.heightPercent}%`,
                    top: `${ringFrame.topPercent}%`,
                    left: `${ringFrame.leftPercent}%`,
                    pointerEvents: "none",
                    overflow: "visible",
                    color: isPulseFocus ? rgba(r, g, b, 0.58) : cfg.ringColor,
                    opacity: isDimmedByPulse ? 0.16 : 1,
                    filter: isPulseFocus
                      ? `drop-shadow(0 0 8px ${rgba(r, g, b, 0.16)}) drop-shadow(0 0 18px ${rgba(r, g, b, 0.1)})`
                      : "none",
                    transition: dragging === i ? "none" : "color 0.3s, opacity 0.4s ease, filter 0.4s ease",
                    animation: isPulseFocus
                      ? `ring-shimmer var(--shimmer-duration, 6s) ease-in-out infinite, orrery-return-ring-pulse ${RETURN_PULSE_ANIMATION}`
                      : undefined,
                  }}
                >
                  <ellipse
                    cx="50"
                    cy="50"
                    rx="49"
                    ry="49"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={es === "ARCHIVED" ? 0.5 : 1}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={
                      es === "ARCHIVED"
                        ? "1.2 7"
                        : es === "DRIFTING"
                          ? "7 7"
                          : undefined
                    }
                  />
                </svg>
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
              {isDemo && <span>This is a public demo</span>}
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
              const settings = normalizedSettings[i];
              const isArchived = es === "ARCHIVED";
              const isDrifting = es === "DRIFTING";
              const isDraggingThis = dragging === i;
              const isPulseFocus =
                returnPulseActive && returnPulseTargetId === domain.id;
              const isDimmedByPulse = returnPulseActive && !isPulseFocus;
              const isHoverMatch =
                !returnPulseActive &&
                (matchesHoverMetric(hoveredMetric, es) ||
                  hoveredCountdownDomainId === domain.id);
              const isHighlightMatch = isHoverMatch || isPulseFocus;
              const dot = planetSize(radii[i], es, settings.planetSizeScale);
              const eccentricityRatio =
                es === "ACTIVE"
                  ? getOrbitEccentricityRatio(settings.orbitEccentricity)
                  : 1;
              const semiMajorRadiusPx = radii[i] * (sizeRef.current / 2);
              const orbitPoint = getOrbitPosition(
                semiMajorRadiusPx,
                anglesRef.current[i],
                eccentricityRatio,
              );
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
                    transform: "translate3d(0, 0, 0)",
                    willChange: "transform",
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      top: 0,
                      left: 0,
                      transform: `translate3d(${orbitPoint.x}px, ${orbitPoint.y}px, 0)`,
                      willChange: "transform",
                    }}
                    ref={(el) => { moverRefs.current[i] = el; }}
                  >
                    <div
                      data-counter
                      className="absolute"
                      style={{
                        left: -(dot / 2),
                        top: -(dot / 2),
                        width: dot,
                        height: dot,
                        transform: "rotate(0deg)",
                        transformOrigin: "center center",
                        willChange: "transform",
                        opacity: isDimmedByPulse ? 0.18 : 1,
                        transition: "opacity 0.4s ease",
                      }}
                      ref={(el) => { counterRefs.current[i] = el; }}
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
                          opacity: isHighlightMatch ? (isArchived ? 0.8 : 0.95) : undefined,
                          filter: isHighlightMatch ? "brightness(1.14) saturate(1.08)" : "none",
                          transition: "transform 0.25s ease, opacity 0.25s ease, filter 0.25s ease",
                          transform: isDraggingThis ? "scale(1.8)" : isHighlightMatch ? "scale(1.14)" : "scale(1)",
                          animation: isPulseFocus
                            ? `orrery-return-halo-pulse ${RETURN_PULSE_ANIMATION}`
                            : undefined,
                        }}
                      />
                        {/* Dot */}
                        <div
                          className={isArchived ? "asteroid-shape relative" : "rounded-full relative"}
                          style={{
                          width: dot,
                          height: dot,
                          backgroundColor: cfg.color,
                          boxShadow: isPulseFocus
                            ? `${cfg.glow}, ${cfg.glowSoft}, 0 0 22px ${cfg.color}44, 0 0 60px ${cfg.color}22`
                            : isHoverMatch
                              ? `${cfg.glow}, ${cfg.glowSoft}, 0 0 18px ${cfg.color}33`
                              : cfg.glow,
                          opacity: isArchived ? 0.4 : 1,
                          filter: isHighlightMatch ? "brightness(1.18) saturate(1.08)" : "none",
                          transition: "transform 0.2s ease, box-shadow 0.25s ease, filter 0.25s ease",
                          transform: isDraggingThis ? "scale(1.4)" : isHighlightMatch ? "scale(1.08)" : "scale(1)",
                          animation: isPulseFocus
                            ? `orrery-return-planet-pulse ${RETURN_PULSE_ANIMATION}`
                            : undefined,
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
                            color: isArchived
                              ? (isHighlightMatch ? "rgba(228,228,231,0.88)" : "rgba(113,113,122,0.4)")
                              : isDrifting
                                ? (isHighlightMatch ? "#fca5a5" : "#f87171")
                                : (isDraggingThis || isHighlightMatch ? cfg.color : "rgba(161,161,170,0.7)"),
                            textShadow: isHighlightMatch ? `0 0 14px ${cfg.color}2e` : isDrifting ? "0 0 8px rgba(248,113,113,0.4)" : "none",
                            animation: isPulseFocus
                              ? `orrery-return-label-pulse ${RETURN_PULSE_ANIMATION}`
                              : undefined,
                          }}
                        >
                          {domain.name}
                        </p>
                        {(isDrifting || isArchived) && (
                          <p
                            className="text-[8px] font-mono tracking-widest uppercase text-center mt-0.5 transition-opacity"
                            style={{
                              color: isDrifting ? "rgba(248,113,113,0.5)" : cfg.color,
                              opacity: isHighlightMatch ? 0.9 : isArchived ? 0.25 : 0.7,
                            }}
                          >
                            {cfg.label}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 md:px-8 md:pb-5 lg:px-12">
          <div className="flex flex-col items-center justify-center gap-4 lg:relative lg:min-h-[72px] lg:gap-0">
            <div className="flex w-full flex-col items-start gap-1.5 text-left lg:absolute lg:bottom-0 lg:left-0 lg:w-auto">
              {footerStats.map((stat) => {
                const isHovered = hoveredMetric === stat.key;
                return (
                  <p
                    key={stat.key}
                    onPointerEnter={() => setHoveredMetric(stat.key)}
                    onPointerLeave={() => setHoveredMetric(null)}
                    className="flex items-baseline font-mono text-[9px] uppercase tracking-[0.35em] leading-none text-zinc-700 transition-all duration-300"
                    style={{
                      cursor: "default",
                      color: isHovered ? "rgba(228,228,231,0.92)" : undefined,
                      textShadow: isHovered ? "0 0 18px rgba(255,255,255,0.10)" : "none",
                      transform: isHovered ? "translateX(2px)" : "translateX(0)",
                    }}
                  >
                    <span
                      className="tabular-nums text-zinc-300"
                      style={{
                        width: `${countSlotWidthCh}ch`,
                        textAlign: "right",
                        flex: "0 0 auto",
                      }}
                    >
                      {stat.count}
                    </span>
                    <span className="pl-[0.9em]">{stat.label}</span>
                  </p>
                );
              })}
            </div>

            <p className="text-[10px] font-mono tracking-[0.3em] uppercase leading-none text-zinc-800 text-center hidden lg:absolute lg:bottom-0 lg:left-1/2 lg:block lg:-translate-x-1/2">
            Drag planets to adjust orbit · Click to enter · 1–9 to navigate
            </p>
            <p className="text-[10px] font-mono tracking-[0.25em] uppercase leading-none text-zinc-800 text-center lg:hidden">
              Tap planets to enter · Drag to adjust orbit
            </p>

            {alignable.length > 0 && (
                <Link
                  href={isDemo ? "/login" : domainUrl(alignable[0].slug, `align=${encodeURIComponent(alignSlugs)}&idx=0`)}
                  className="group text-[10px] font-mono tracking-[0.35em] uppercase leading-none lg:absolute lg:right-0 lg:bottom-0"
                >
                  <span className="text-zinc-600 group-hover:text-zinc-400 group-active:text-zinc-400 transition-colors duration-500">Align </span>
                  <span className="text-zinc-700 group-hover:text-cyan-400 group-active:text-cyan-400 transition-colors duration-500 align-arrow">→</span>
                </Link>
            )}
          </div>
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
                e.stopPropagation();
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
