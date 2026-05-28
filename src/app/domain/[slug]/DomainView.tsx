"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createCommitment,
  clearCommitments,
  deleteDomain,
  loadAllCommitments,
  recordPassiveAlignmentTouch,
  setDomainSubtaskCompletion,
  updateDomainColor,
  updateDomainFields,
  updateDomainName,
  updateDomainStatus,
} from "./actions";
import {
  formatDriftThresholdLabel,
  getEffectiveDriftThresholdHours,
  getSubtaskCompletionKey,
  type DomainSettingsSnapshot,
} from "@/lib/domain-settings";
import { QUOTES } from "./quotes";
import "./domain.css";

const QUOTE_REVEAL_DELAY_MS = 720;
const QUOTE_HOLD_DELAY_MS = 1480;
const QUOTE_NAVIGATE_DELAY_MS = 5200;
const QUOTE_FALLBACK_CLEAR_DELAY_MS = 7600;

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d + 6) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) { rr = c; gg = x; }
  else if (h < 120) { rr = x; gg = c; }
  else if (h < 180) { gg = c; bb = x; }
  else if (h < 240) { gg = x; bb = c; }
  else if (h < 300) { rr = x; bb = c; }
  else { rr = c; bb = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
}

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"sv" | "hue" | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const applyColor = useCallback((newHsv: { h: number; s: number; v: number }) => {
    setHsv(newHsv);
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [onChange]);

  const handleSvMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    applyColor({ ...hsv, s, v });
  }, [hsv, applyColor]);

  const handleHueMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    applyColor({ ...hsv, h });
  }, [hsv, applyColor]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current === "sv") handleSvMove(e);
      else if (dragging.current === "hue") handleHueMove(e);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const synthetic = { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent;
      if (dragging.current === "sv") handleSvMove(synthetic);
      else if (dragging.current === "hue") handleHueMove(synthetic);
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [handleSvMove, handleHueMove]);

  const { r: pr, g: pg, b: pb } = hexToRgb(color);
  const pureHue = hsvToHex(hsv.h, 1, 1);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-5 h-5 rounded-full border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px rgba(${pr},${pg},${pb},0.3)`,
        }}
      />

      {open && (
        <div
          className="absolute top-8 left-0 z-50 p-3 rounded-lg color-picker-panel touch-none sm:left-1/2 sm:-translate-x-1/2"
          style={{
            width: "min(12.5rem, calc(100vw - 1.5rem))",
            backgroundColor: "rgba(12,12,14,0.95)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* SV area */}
          <div
            ref={svRef}
            className="h-32 w-full rounded relative cursor-crosshair"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHue})`,
            }}
            onMouseDown={(e) => { dragging.current = "sv"; handleSvMove(e); }}
            onTouchStart={(e) => { dragging.current = "sv"; const t = e.touches[0]; handleSvMove({ clientX: t.clientX, clientY: t.clientY } as React.MouseEvent); }}
          >
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                boxShadow: "0 0 3px rgba(0,0,0,0.5)",
              }}
            />
          </div>

          {/* Hue bar */}
          <div
            ref={hueRef}
            className="h-3 w-full rounded-full mt-3 relative cursor-pointer"
            style={{
              background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
            onMouseDown={(e) => { dragging.current = "hue"; handleHueMove(e); }}
            onTouchStart={(e) => { dragging.current = "hue"; const t = e.touches[0]; handleHueMove({ clientX: t.clientX, clientY: t.clientY } as React.MouseEvent); }}
          >
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 top-0 pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                boxShadow: "0 0 3px rgba(0,0,0,0.5)",
              }}
            />
          </div>

          {/* Hex display */}
          <p className="mt-2 text-[9px] font-mono tracking-widest text-zinc-600 text-center uppercase">
            {color}
          </p>
        </div>
      )}
    </div>
  );
}

function getRandomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

type Commitment = {
  id: string;
  text: string;
  createdAt: string;
};

type Subtask = {
  id: string;
  label: string;
  sortOrder: number;
  completedAt: string | null;
};

const DOMAIN_STATUS_OPTIONS = ["ALIGNED", "DRIFTING", "ARCHIVED"] as const;
type DomainStatusOption = (typeof DOMAIN_STATUS_OPTIONS)[number];

type DomainViewProps = {
  domain: {
    id: string;
    name: string;
    slug: string;
    status: string;
    color: string | null;
    identity: string | null;
    vision: string | null;
    primaryReason: string | null;
    primaryCost: string | null;
    currentReality: string | null;
  };
  settings: DomainSettingsSnapshot;
  commitments: Commitment[];
  subtasks: Subtask[];
  alignChain?: string[] | null;
  alignIdx?: number;
  demoUser?: string;
};

function formatCompactThreshold(hours: number) {
  return hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`;
}

export function DomainView({
  domain,
  settings,
  commitments,
  subtasks,
  alignChain,
  alignIdx = 0,
  demoUser,
}: DomainViewProps) {
  const [currentColor, setCurrentColor] = useState(domain.color ?? "#67e8f9");
  const color = currentColor;
  const { r, g, b } = hexToRgb(color);
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState("");
  const [commitError, setCommitError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState(commitments);
  const [subtaskItems, setSubtaskItems] = useState(subtasks);
  const [subtaskError, setSubtaskError] = useState("");
  const [subtaskPeriodKey, setSubtaskPeriodKey] = useState(() =>
    getSubtaskCompletionKey(settings.subtaskResetMode, settings.subtaskTimeZone),
  );
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(domain.status);
  const router = useRouter();
  const [particleDistances] = useState(() =>
    Array.from({ length: 12 }, () => 80 + Math.random() * 60),
  );
  const commitSectionRef = useRef<HTMLElement | null>(null);
  const passiveAlignmentRecordedRef = useRef(false);
  const effectiveDriftThresholdHours = getEffectiveDriftThresholdHours(settings);
  const usesPassiveAlignment = settings.commitmentRequirement === "PASSIVE_ALIGNMENT";
  const usesSubtasks = settings.commitmentRequirement === "SUBTASKS";
  const completedSubtaskCount = subtaskItems.filter(
    (subtask) => subtask.completedAt,
  ).length;
  const allSubtasksComplete =
    subtaskItems.length > 0 && completedSubtaskCount === subtaskItems.length;

  // Navigation helpers for demo-edit mode
  const buildHomeUrl = useCallback((pulseDomainId?: string) => {
    const params = new URLSearchParams();
    if (demoUser) params.set("demo", "edit");
    if (pulseDomainId) params.set("pulseDomain", pulseDomainId);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }, [demoUser]);
  const homeUrl = buildHomeUrl();
  const domainLink = useCallback((slug: string, extra?: string) => {
    const params = new URLSearchParams();
    if (demoUser) params.set("demoUser", demoUser);
    if (extra) {
      new URLSearchParams(extra).forEach((value: string, key: string) =>
        params.set(key, value),
      );
    }
    const qs = params.toString();
    return qs ? `/domain/${slug}?${qs}` : `/domain/${slug}`;
  }, [demoUser]);
  const alignQuery = alignChain
    ? `align=${encodeURIComponent(alignChain.join(","))}&idx=${alignIdx}`
    : undefined;
  const settingsHref = (() => {
    const params = new URLSearchParams();
    if (demoUser) params.set("demoUser", demoUser);
    if (alignChain) {
      params.set("align", alignChain.join(","));
      params.set("idx", String(alignIdx));
    }
    const qs = params.toString();
    return qs ? `/domain/${domain.slug}/settings?${qs}` : `/domain/${domain.slug}/settings`;
  })();

  // Editing state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(domain.name);
  const [editVision, setEditVision] = useState(domain.vision ?? "");
  const [editReason, setEditReason] = useState(domain.primaryReason ?? "");
  const [editCost, setEditCost] = useState(domain.primaryCost ?? "");
  const [isSaving, startSaveTransition] = useTransition();
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({
    name: domain.name,
    vision: domain.vision ?? "",
    primaryReason: domain.primaryReason ?? "",
    primaryCost: domain.primaryCost ?? "",
  });

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  // Debounced color update
  const colorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleColorChange = useCallback((newColor: string) => {
    setCurrentColor(newColor);
    if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
    colorTimerRef.current = setTimeout(() => {
      updateDomainColor(domain.id, newColor, demoUser);
    }, 400);
  }, [demoUser, domain.id]);

  const handleStatusChange = useCallback((status: "ALIGNED" | "DRIFTING" | "ARCHIVED") => {
    setCurrentStatus(status);
    startTransition(async () => {
      await updateDomainStatus(domain.id, status, demoUser);
      router.refresh();
    });
  }, [demoUser, domain.id, router, startTransition]);

  const isAligning = !!alignChain;
  const isLastInChain = !alignChain || alignIdx >= alignChain.length - 1;

  // Quote overlay state
  const [quoteOverlay, setQuoteOverlay] = useState(false);
  const [quotePhase, setQuotePhase] = useState<"burst" | "reveal" | "hold" | "collapse" | "gone">("gone");
  const [quoteText, setQuoteText] = useState("");
  const quoteTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setSubtaskItems(subtasks);
  }, [subtasks]);

  useEffect(() => {
    setSubtaskPeriodKey(
      getSubtaskCompletionKey(settings.subtaskResetMode, settings.subtaskTimeZone),
    );
  }, [settings.subtaskResetMode, settings.subtaskTimeZone]);

  useEffect(() => {
    if (!usesSubtasks || settings.subtaskResetMode !== "DAILY") return;

    const timer = window.setInterval(() => {
      const nextPeriodKey = getSubtaskCompletionKey(
        settings.subtaskResetMode,
        settings.subtaskTimeZone,
      );

      if (nextPeriodKey === subtaskPeriodKey) return;

      setSubtaskPeriodKey(nextPeriodKey);
      setSubtaskItems((current) =>
        current.map((subtask) => ({ ...subtask, completedAt: null })),
      );
      router.refresh();
    }, 30 * 1000);

    return () => window.clearInterval(timer);
  }, [
    router,
    settings.subtaskResetMode,
    settings.subtaskTimeZone,
    subtaskPeriodKey,
    usesSubtasks,
  ]);

  useEffect(() => {
    passiveAlignmentRecordedRef.current = false;

    if (settings.commitmentRequirement !== "PASSIVE_ALIGNMENT") return;

    const commitSection = commitSectionRef.current;
    const scrollRoot = document.querySelector(".domain-snap-container");
    if (!commitSection || !(scrollRoot instanceof HTMLElement)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.6) return;
        if (passiveAlignmentRecordedRef.current) return;

        passiveAlignmentRecordedRef.current = true;
        void recordPassiveAlignmentTouch(domain.id, demoUser);
      },
      {
        root: scrollRoot,
        threshold: [0.6],
      },
    );

    observer.observe(commitSection);
    return () => observer.disconnect();
  }, [demoUser, domain.id, settings.commitmentRequirement]);

  const clearQuoteTimers = useCallback(() => {
    quoteTimersRef.current.forEach((timer) => clearTimeout(timer));
    quoteTimersRef.current = [];
  }, []);

  useEffect(() => clearQuoteTimers, [clearQuoteTimers]);

  const getPostCommitHref = useCallback(() => {
    if (isAligning && !isLastInChain && alignChain) {
      const nextIdx = alignIdx + 1;
      const nextSlug = alignChain[nextIdx];
      const slugs = alignChain.join(",");
      return domainLink(nextSlug, `align=${encodeURIComponent(slugs)}&idx=${nextIdx}`);
    }

    return buildHomeUrl(domain.id);
  }, [alignChain, alignIdx, buildHomeUrl, domain.id, domainLink, isAligning, isLastInChain]);

  const navigateAfterCommit = useCallback(() => {
    router.push(getPostCommitHref());
    return; /*
    if (isAligning && !isLastInChain && alignChain) {
      // Go to next domain in align chain
      const nextIdx = alignIdx + 1;
      const nextSlug = alignChain[nextIdx];
      const slugs = alignChain.join(",");
      router.push(domainLink(nextSlug, `align=${encodeURIComponent(slugs)}&idx=${nextIdx}`));
    } else {
      // Last in chain or standalone — go home and spotlight the recommitted planet
      router.push(buildHomeUrl(domain.id));
    }
  */ }, [getPostCommitHref, router]);

  const navigateWithoutCommitPulse = useCallback(() => {
    if (isAligning && !isLastInChain && alignChain) {
      const nextIdx = alignIdx + 1;
      const nextSlug = alignChain[nextIdx];
      const slugs = alignChain.join(",");
      router.push(domainLink(nextSlug, `align=${encodeURIComponent(slugs)}&idx=${nextIdx}`));
      return;
    }

    router.push(homeUrl);
  }, [alignChain, alignIdx, domainLink, homeUrl, isAligning, isLastInChain, router]);

  const startAlignmentOverlay = useCallback(() => {
    const postCommitHref = getPostCommitHref();
    router.prefetch(postCommitHref);
    clearQuoteTimers();
    setQuoteText(getRandomQuote());
    setQuoteOverlay(true);
    setQuotePhase("burst");
    quoteTimersRef.current = [
      setTimeout(() => setQuotePhase("reveal"), QUOTE_REVEAL_DELAY_MS),
      setTimeout(() => setQuotePhase("hold"), QUOTE_HOLD_DELAY_MS),
      setTimeout(() => {
        navigateAfterCommit();
      }, QUOTE_NAVIGATE_DELAY_MS),
      setTimeout(() => {
        setQuotePhase("gone");
        setQuoteOverlay(false);
      }, QUOTE_FALLBACK_CLEAR_DELAY_MS),
    ];
  }, [clearQuoteTimers, getPostCommitHref, navigateAfterCommit, router]);

  const handleCommit = useCallback(() => {
    if (!text.trim()) return;
    setCommitError("");
    startTransition(async () => {
      try {
        const result = await createCommitment(domain.id, text.trim(), demoUser);
        if (!result.success) {
          setCommitError(result.error || "Failed to create commitment.");
          return;
        }

        setText("");
        startAlignmentOverlay();
      } catch {
        setCommitError("Failed to create commitment.");
      }
    });
  }, [demoUser, domain.id, startAlignmentOverlay, startTransition, text]);

  const handleSubtaskToggle = useCallback(
    (subtask: Subtask) => {
      if (allSubtasksComplete || isPending) return;

      const nextCompleted = !subtask.completedAt;
      const optimisticCompletedAt = new Date().toISOString();
      setSubtaskError("");
      setSubtaskItems((current) =>
        current.map((item) =>
          item.id === subtask.id
            ? {
                ...item,
                completedAt: nextCompleted ? optimisticCompletedAt : null,
              }
            : item,
        ),
      );

      startTransition(async () => {
        const result = await setDomainSubtaskCompletion(
          domain.id,
          subtask.id,
          nextCompleted,
          demoUser,
        );

        if (!result.success) {
          setSubtaskError(result.error);
          setSubtaskItems((current) =>
            current.map((item) =>
              item.id === subtask.id
                ? { ...item, completedAt: subtask.completedAt }
                : item,
            ),
          );
          return;
        }

        const completedIds = new Set(result.completedSubtaskIds);
        setSubtaskItems((current) =>
          current.map((item) => ({
            ...item,
            completedAt: completedIds.has(item.id)
              ? item.completedAt ?? optimisticCompletedAt
              : null,
          })),
        );

        if (result.aligned) {
          setCurrentStatus("ALIGNED");
          startAlignmentOverlay();
        }
      });
    },
    [
      allSubtasksComplete,
      demoUser,
      domain.id,
      isPending,
      startAlignmentOverlay,
      startTransition,
    ],
  );

  const handleSkip = useCallback(() => {
    if (isAligning) {
      navigateWithoutCommitPulse();
    }
  }, [isAligning, navigateWithoutCommitPulse]);

  const handleClear = useCallback(() => {
    setClearing(true);
    startTransition(async () => {
      await clearCommitments(domain.id, demoUser);
      setShowHistory(false);
      setHistoryItems([]);
      setHistoryLoaded(true);
      setClearing(false);
      router.refresh();
    });
  }, [demoUser, domain.id, router, startTransition]);

  const toggleHistory = useCallback(() => {
    const nextOpen = !showHistory;
    setShowHistory(nextOpen);

    if (nextOpen && !historyLoaded && !historyLoading) {
      setHistoryLoading(true);
      void loadAllCommitments(domain.id, demoUser)
        .then((allCommitments) => {
          setHistoryItems(allCommitments);
          setHistoryLoaded(true);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [demoUser, domain.id, historyLoaded, historyLoading, showHistory]);

  const persistEdits = useCallback(
    ({
      includeName = false,
      exitEditing = false,
      redirectIfSlugChanges = false,
    }: {
      includeName?: boolean;
      exitEditing?: boolean;
      redirectIfSlugChanges?: boolean;
    } = {}) => {
      const trimmedName = editName.trim();
      if (includeName && !trimmedName) {
        setEditName(lastSavedRef.current.name);
      }

      const nextName = trimmedName || lastSavedRef.current.name;
      const nameChanged = includeName && nextName !== lastSavedRef.current.name;
      const visionChanged = editVision !== lastSavedRef.current.vision;
      const reasonChanged = editReason !== lastSavedRef.current.primaryReason;
      const costChanged = editCost !== lastSavedRef.current.primaryCost;

      if (!nameChanged && !visionChanged && !reasonChanged && !costChanged) {
        if (exitEditing) {
          setEditing(false);
        }
        return;
      }

      startSaveTransition(async () => {
        const promises: Promise<void>[] = [];

        if (nameChanged) {
          promises.push(updateDomainName(domain.id, nextName, demoUser));
        }

        const fields: Record<string, string> = {};
        if (visionChanged) fields.vision = editVision;
        if (reasonChanged) fields.primaryReason = editReason;
        if (costChanged) fields.primaryCost = editCost;
        if (Object.keys(fields).length > 0) {
          promises.push(updateDomainFields(domain.id, fields, demoUser));
        }

        await Promise.all(promises);

        lastSavedRef.current = {
          name: nameChanged ? nextName : lastSavedRef.current.name,
          vision: visionChanged ? editVision : lastSavedRef.current.vision,
          primaryReason: reasonChanged
            ? editReason
            : lastSavedRef.current.primaryReason,
          primaryCost: costChanged ? editCost : lastSavedRef.current.primaryCost,
        };

        if (exitEditing) {
          setEditing(false);
        }

        if (nameChanged && redirectIfSlugChanges) {
          const newSlug = nextName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          router.push(domainLink(newSlug, alignQuery));
        }
      });
    },
    [
      alignQuery,
      demoUser,
      domain.id,
      domainLink,
      editCost,
      editName,
      editReason,
      editVision,
      router,
      startSaveTransition,
    ],
  );

  const flushFieldAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    persistEdits();
  }, [persistEdits]);

  const handleDoneEditing = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    persistEdits({
      includeName: true,
      exitEditing: true,
      redirectIfSlugChanges: true,
    });
  }, [persistEdits]);

  useEffect(() => {
    if (!editing) return;

    const fieldsChanged =
      editVision !== lastSavedRef.current.vision ||
      editReason !== lastSavedRef.current.primaryReason ||
      editCost !== lastSavedRef.current.primaryCost;

    if (!fieldsChanged) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      persistEdits();
      autosaveTimerRef.current = null;
    }, 700);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [editCost, editReason, editVision, editing, persistEdits]);

  const handleDelete = useCallback(() => {
    startDeleteTransition(async () => {
      await deleteDomain(domain.id, demoUser);
      router.push(homeUrl);
    });
  }, [demoUser, domain.id, homeUrl, router, startDeleteTransition]);

  return (
    <>
      {/* Quote overlay */}
      {quoteOverlay && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-8 ${
            quotePhase === "collapse" ? "quote-bg-collapse" : "quote-bg-enter"
          }`}
          style={{ backgroundColor: "rgba(0,0,0,0.97)" }}
        >
          {/* Shockwave ring */}
          <div
            className="absolute quote-shockwave rounded-full"
            style={{
              width: 10, height: 10,
              top: "50%", left: "50%",
              border: `1px solid rgba(${r},${g},${b},0.6)`,
              boxShadow: `0 0 20px rgba(${r},${g},${b},0.3), inset 0 0 20px rgba(${r},${g},${b},0.1)`,
            }}
          />

          {/* Second ring (delayed) */}
          <div
            className="absolute quote-shockwave-2 rounded-full"
            style={{
              width: 10, height: 10,
              top: "50%", left: "50%",
              border: `1px solid rgba(${r},${g},${b},0.3)`,
            }}
          />

          {/* Center flash */}
          <div
            className="absolute quote-flash rounded-full"
            style={{
              width: 4, height: 4,
              top: "50%", left: "50%",
              backgroundColor: color,
              boxShadow: `0 0 30px rgba(${r},${g},${b},0.8), 0 0 60px rgba(${r},${g},${b},0.4), 0 0 120px rgba(${r},${g},${b},0.2)`,
            }}
          />

          {/* Particles */}
          {Array.from({ length: 12 }).map((_: unknown, i: number) => (
            <div
              key={i}
              className="absolute quote-particle rounded-full"
              style={{
                width: 2, height: 2,
                top: "50%", left: "50%",
                backgroundColor: `rgba(${r},${g},${b},0.6)`,
                ["--angle" as string]: `${(i * 30)}deg`,
                ["--distance" as string]: `${particleDistances[i]}px`,
                ["--delay" as string]: `${i * 0.04}s`,
                boxShadow: `0 0 4px rgba(${r},${g},${b},0.4)`,
              }}
            />
          ))}

          {/* Horizontal accent lines */}
          <div
            className={`absolute w-full flex items-center justify-center transition-all duration-1000 ${
              quotePhase === "reveal" || quotePhase === "hold" ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`h-px transition-all duration-1000 ease-out ${
                quotePhase === "reveal" || quotePhase === "hold" ? "w-16 md:w-32" : "w-0"
              }`}
              style={{
                background: `linear-gradient(to right, transparent, rgba(${r},${g},${b},0.2), transparent)`,
                marginRight: "min(280px, 40vw)",
                marginTop: -2,
              }}
            />
          </div>
          <div
            className={`absolute w-full flex items-center justify-center transition-all duration-1000 ${
              quotePhase === "reveal" || quotePhase === "hold" ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`h-px transition-all duration-1000 ease-out ${
                quotePhase === "reveal" || quotePhase === "hold" ? "w-16 md:w-32" : "w-0"
              }`}
              style={{
                background: `linear-gradient(to left, transparent, rgba(${r},${g},${b},0.2), transparent)`,
                marginLeft: "min(280px, 40vw)",
                marginTop: -2,
              }}
            />
          </div>

          {/* Quote text */}
          <p
            className={`relative z-10 max-w-2xl text-center text-lg sm:text-2xl md:text-3xl italic leading-relaxed transition-all ${
              quotePhase === "reveal" || quotePhase === "hold"
                ? "opacity-100 translate-y-0 blur-0 duration-1000"
                : quotePhase === "collapse"
                ? "opacity-0 scale-95 blur-sm duration-500"
                : "opacity-0 translate-y-3 blur-sm duration-500"
            }`}
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              color: "rgba(255,255,255,0.92)",
              textShadow: `0 0 40px rgba(${r},${g},${b},0.15), 0 0 80px rgba(${r},${g},${b},0.08)`,
              letterSpacing: "0.01em",
            }}
          >
            {quoteText}
          </p>
        </div>
      )}

      <main className="min-h-screen w-full overflow-x-hidden bg-black text-white domain-snap-container">
        {/* Ambient */}
        <div className="fixed inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute domain-ambient rounded-full"
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
        <div className="fixed top-0 left-0 right-0 z-30 px-4 py-4 sm:px-5 md:px-12 md:py-6">
          <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4 sm:items-center">
            <Link
              href={homeUrl}
              className="shrink-0 py-2 text-[10px] md:text-[9px] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase text-zinc-500 hover:text-zinc-300 active:text-zinc-300 transition-colors"
            >
              ← Axis
            </Link>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 text-right md:gap-x-6">
              {isAligning && (
                <p className="shrink-0 text-[9px] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase text-zinc-500">
                  {alignIdx + 1} / {alignChain!.length}
                </p>
              )}
              {editing ? (
                <button
                  onClick={handleDoneEditing}
                  disabled={isSaving}
                  className="shrink-0 text-[9px] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Done"}
                </button>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 text-[9px] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  Edit
                </button>
              )}
              {editing ? (
                <span className="shrink-0 text-[9px] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase text-zinc-600/80">
                  Settings
                </span>
              ) : (
                <Link
                  href={settingsHref}
                  className="shrink-0 text-[9px] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  Settings
                </Link>
              )}
              <p
                className="shrink-0 text-[9px] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase"
                style={{ color: `rgba(${r},${g},${b},0.3)` }}
              >
                {currentStatus === "DRIFTING" ? "Drifting" : currentStatus === "ARCHIVED" ? "Archived" : "Active"}
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Hero */}
        <section className="domain-snap-section relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
            <div
              className={`domain-planet rounded-full mb-8 transition-all duration-1000 ${
                mounted ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
              style={{
                width: 12, height: 12,
                backgroundColor: color,
                boxShadow: `0 0 8px rgba(${r},${g},${b},0.8), 0 0 24px rgba(${r},${g},${b},0.4), 0 0 60px rgba(${r},${g},${b},0.12)`,
              }}
            />
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() =>
                  persistEdits({
                    includeName: true,
                    redirectIfSlugChanges: true,
                  })
                }
                className={`w-full text-3xl sm:text-5xl md:text-7xl font-semibold tracking-tight text-center bg-transparent outline-none border-b border-zinc-800 focus:border-zinc-600 transition-all duration-1000 text-white ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: "300ms" }}
              />
            ) : (
              <h1
                className={`w-full text-3xl sm:text-5xl md:text-7xl font-semibold tracking-tight text-center transition-all duration-1000 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: "300ms" }}
              >
                {editName.trim() || domain.name}
              </h1>
            )}
            {!editing && domain.identity ? (
              <p
                className={`mt-5 max-w-sm text-sm text-zinc-500 text-center transition-all duration-1000 ${
                  mounted ? "opacity-100" : "opacity-0"
                }`}
                style={{ transitionDelay: "600ms" }}
              >
                {domain.identity}
              </p>
            ) : null}

            {/* Controls: color + status */}
            <div
              className={`mt-10 flex w-full max-w-md flex-wrap items-center justify-center gap-x-6 gap-y-4 transition-all duration-1000 ${
                mounted ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDelay: "900ms" }}
            >
              {/* Color picker */}
              <ColorPicker color={color} onChange={handleColorChange} />

              {/* Status toggles */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                {DOMAIN_STATUS_OPTIONS.map((status: DomainStatusOption) => {
                  const isActive =
                    currentStatus === status ||
                    (status === "ALIGNED" &&
                      (currentStatus === "ALIGNED" ||
                        currentStatus === "NEUTRAL"));
                  const label =
                    status === "ALIGNED"
                      ? "Active"
                      : status === "DRIFTING"
                        ? "Drifting"
                        : "Archived";
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={isPending}
                      className={`py-1 text-[9px] font-mono tracking-[0.2em] uppercase transition-all duration-500 ${
                        isActive ? "" : "text-zinc-600 hover:text-zinc-400 active:text-zinc-400"
                      } ${isPending ? "opacity-50" : ""}`}
                      style={{
                        color: isActive
                          ? status === "DRIFTING"
                            ? "rgba(248,113,113,0.6)"
                            : status === "ARCHIVED"
                              ? "rgba(113,113,122,0.6)"
                              : `rgba(${r},${g},${b},0.6)`
                          : undefined,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delete — only in edit mode, below controls */}
            {editing && (
              <div className="mt-8">
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-600 hover:text-red-400/60 transition-colors duration-500"
                  >
                    Delete domain
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                    <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-500">
                      Are you sure?
                    </p>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-[9px] font-mono tracking-[0.2em] uppercase text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      {isDeleting ? "Deleting..." : "Delete forever"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="absolute bottom-16 domain-scroll">
            <div
              className="w-px h-10"
              style={{
                background: `linear-gradient(to bottom, rgba(${r},${g},${b},0.25), transparent)`,
              }}
            />
          </div>
        </section>

        {/* Section 2: Vision */}
        <section className="domain-snap-section min-h-screen flex w-full items-center justify-center px-5 sm:px-6 relative z-10">
          <div className="mx-auto w-full max-w-lg text-center">
            <p
              className="text-[10px] font-mono tracking-[0.5em] uppercase mb-8"
              style={{ color: `rgba(${r},${g},${b},0.4)` }}
            >
              Vision
            </p>
            {editing ? (
              <textarea
                value={editVision}
                onChange={(e) => setEditVision(e.target.value)}
                placeholder="What does success look like?"
                rows={4}
                onBlur={flushFieldAutosave}
                className="w-full text-xl md:text-2xl font-light leading-10 text-zinc-200 bg-transparent outline-none border-b border-zinc-800 focus:border-zinc-600 transition-colors placeholder:text-zinc-800 resize-none text-center"
              />
            ) : (
                <p className="whitespace-pre-wrap text-xl md:text-2xl font-light leading-10 text-zinc-200">
                  {editVision || "No vision defined yet."}
                </p>
            )}
          </div>
        </section>

        {/* Section 3: Reason + Cost */}
        <section className="domain-snap-section min-h-screen flex w-full items-center justify-center px-5 sm:px-6 md:px-16 relative z-10">
          <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-40">
            <div className="text-center md:text-right">
              <p
                className="text-[10px] font-mono tracking-[0.5em] uppercase mb-6"
                style={{ color: `rgba(${r},${g},${b},0.4)` }}
              >
                Reason
              </p>
              {editing ? (
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  onBlur={flushFieldAutosave}
                  placeholder="Why does this matter?"
                  rows={3}
                  className="w-full text-base leading-8 text-zinc-300 font-light bg-transparent outline-none border-b border-zinc-800 focus:border-zinc-600 transition-colors placeholder:text-zinc-800 resize-none text-center md:text-right"
                />
              ) : (
                <p className="whitespace-pre-wrap text-base leading-8 text-zinc-300 font-light">
                  {editReason || "No reason defined yet."}
                </p>
              )}
            </div>

            <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="w-px h-24"
                style={{
                  background: `linear-gradient(to bottom, transparent, rgba(${r},${g},${b},0.15), transparent)`,
                }}
              />
            </div>

            <div className="text-center md:text-left">
              <p
                className="text-[10px] font-mono tracking-[0.5em] uppercase mb-6"
                style={{ color: "rgba(248,113,113,0.4)" }}
              >
                Cost
              </p>
              {editing ? (
                <textarea
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  onBlur={flushFieldAutosave}
                  placeholder="What happens if you don't act?"
                  rows={3}
                  className="w-full text-base leading-8 text-zinc-300 font-light bg-transparent outline-none border-b border-zinc-800 focus:border-zinc-600 transition-colors placeholder:text-zinc-800 resize-none text-center md:text-left"
                />
              ) : (
                <p className="whitespace-pre-wrap text-base leading-8 text-zinc-300 font-light">
                  {editCost || domain.currentReality || "No cost defined yet."}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Commitment */}
        <section
          ref={commitSectionRef}
          className="domain-snap-section min-h-screen flex w-full items-center justify-center px-5 sm:px-6 relative z-10"
        >
          {/* Drift warning — side note on desktop, bottom note on mobile */}
          <div className="hidden lg:flex absolute right-[8%] xl:right-[10%] top-1/2 -translate-y-1/2 items-start gap-4 max-w-[280px]">
            <div
              className="w-px shrink-0 mt-1"
              style={{
                height: 64,
                background: `linear-gradient(to bottom, rgba(${r},${g},${b},0.2), transparent)`,
              }}
            />
            <div>
              <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-zinc-500 leading-relaxed">
                {effectiveDriftThresholdHours === null
                  ? "Auto-drift is deactivated"
                  : `${formatDriftThresholdLabel(effectiveDriftThresholdHours)} without ${
                      usesSubtasks
                        ? "a completed checklist"
                        : usesPassiveAlignment
                          ? "an alignment touch"
                          : "a commitment"
                    }`}
              </p>
              <p
                className="text-sm mt-2 tracking-wide text-zinc-500 italic leading-relaxed"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                {effectiveDriftThresholdHours === null
                  ? "This planet only drifts if you move it there yourself."
                  : usesSubtasks
                    ? "Every checked item must be complete before the timer renews."
                    : usesPassiveAlignment
                      ? "Reaching Commit or saving a commitment refreshes this planet."
                      : "and this planet drifts out of orbit."}
              </p>
            </div>
          </div>
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
              {usesSubtasks ? "Tasks" : "Commit"}
            </p>
            {usesSubtasks ? (
              <div>
                {subtaskItems.length > 0 ? (
                  <div className="mx-auto max-w-sm">
                    <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/[0.04] pb-3">
                      <p className="text-left text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-600">
                        {completedSubtaskCount} / {subtaskItems.length}
                      </p>
                      <p
                        className="text-right text-[10px] font-mono uppercase tracking-[0.28em]"
                        style={{
                          color: allSubtasksComplete
                            ? `rgba(${r},${g},${b},0.55)`
                            : "rgba(113,113,122,0.8)",
                        }}
                      >
                        {allSubtasksComplete ? "Aligned" : "Pending"}
                      </p>
                    </div>

                    <div className="space-y-1 text-left">
                      {subtaskItems.map((subtask) => {
                        const checked = !!subtask.completedAt;
                        return (
                          <button
                            key={subtask.id}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            disabled={isPending || allSubtasksComplete}
                            onClick={() => handleSubtaskToggle(subtask)}
                            className="group flex w-full items-center gap-4 py-3 text-left transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <span
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all"
                              style={{
                                borderColor: checked
                                  ? `rgba(${r},${g},${b},0.5)`
                                  : "rgba(255,255,255,0.1)",
                                backgroundColor: checked
                                  ? `rgba(${r},${g},${b},0.12)`
                                  : "transparent",
                                boxShadow: checked
                                  ? `0 0 16px rgba(${r},${g},${b},0.12)`
                                  : "none",
                              }}
                            >
                              {checked ? (
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{
                                    backgroundColor: `rgba(${r},${g},${b},0.8)`,
                                  }}
                                />
                              ) : null}
                            </span>
                            <span
                              className={`min-w-0 flex-1 text-sm leading-6 tracking-wide transition-colors ${
                                checked
                                  ? "text-zinc-500 line-through decoration-white/10"
                                  : "text-zinc-300 group-hover:text-zinc-100"
                              }`}
                            >
                              {subtask.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-sm border-y border-white/[0.04] py-8">
                    <p className="text-sm leading-7 text-zinc-500">
                      No subtasks configured yet.
                    </p>
                    <Link
                      href={settingsHref}
                      className="mt-5 inline-block text-[10px] font-mono uppercase tracking-[0.32em] text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      Add subtasks
                    </Link>
                  </div>
                )}

                {subtaskError ? (
                  <p className="mt-4 text-center text-xs font-mono text-red-400/80">
                    {subtaskError}
                  </p>
                ) : null}

                {isAligning ? (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={handleSkip}
                      className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-500 transition-colors duration-500 hover:text-zinc-300"
                    >
                      Skip →
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
            <input
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (commitError) setCommitError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && text.trim()) handleCommit();
              }}
              placeholder="Today I will..."
              className="w-full bg-transparent text-center text-lg text-white outline-none border-b border-zinc-800 pb-4 placeholder:text-zinc-800 focus:border-zinc-600 transition-colors"
            />
            {commitError && (
              <p className="mt-4 text-center text-xs font-mono text-red-400/80">
                {commitError}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {isAligning && (
                <button
                  onClick={handleSkip}
                  className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-500 transition-colors duration-500 hover:text-zinc-300"
                >
                  Skip →
                </button>
              )}
              <button
                onClick={handleCommit}
                disabled={isPending || !text.trim()}
                className="text-[10px] font-mono tracking-[0.4em] uppercase transition-colors duration-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: `rgba(${r},${g},${b},0.4)` }}
              >
                {isPending ? "Locking in..." : "Lock in →"}
              </button>
            </div>

            {/* Past commitments */}
            {historyItems.length > 0 && (
              <div className="mt-16">
                <button
                  onClick={toggleHistory}
                  className="text-[9px] font-mono tracking-[0.3em] uppercase text-zinc-600 transition-colors hover:text-zinc-400"
                >
                  {showHistory
                    ? "Hide history"
                    : historyLoading
                      ? "Loading history..."
                      : historyLoaded
                        ? `${historyItems.length} past commitment${historyItems.length !== 1 ? "s" : ""}`
                        : "Show past commitments"}
                </button>

                <div
                  className="overflow-hidden transition-all duration-700 ease-out"
                  style={{
                    maxHeight: showHistory ? 500 : 0,
                    opacity: showHistory ? 1 : 0,
                  }}
                >
                  <div className="mt-6 space-y-3 max-h-[280px] overflow-y-auto">
                    {historyItems.map((commitment: Commitment) => (
                      <div key={commitment.id} className="text-left py-2">
                        <p className="text-[12px] text-zinc-500 leading-relaxed">
                          {commitment.text}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-600 mt-1">
                          {formatDate(commitment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleClear}
                    disabled={clearing}
                    className="mt-4 text-[9px] font-mono tracking-[0.2em] uppercase text-zinc-600 transition-colors hover:text-red-400/60 disabled:opacity-30"
                  >
                    {clearing ? "Clearing..." : "Clear history"}
                  </button>
                </div>
              </div>
            )}

            {/* Drift note — mobile only */}
              </>
            )}

            <div className="lg:hidden mt-16 flex items-center justify-center gap-3">
              <div
                className="w-8 h-px shrink-0"
                style={{ background: `linear-gradient(to right, transparent, rgba(${r},${g},${b},0.15))` }}
              />
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-500">
                {effectiveDriftThresholdHours === null
                  ? "drift deactivated"
                  : `${formatCompactThreshold(effectiveDriftThresholdHours)} no ${
                      usesSubtasks
                        ? "completed list"
                        : usesPassiveAlignment
                          ? "alignment touch"
                          : "commit"
                    }`}
                <span
                  className="italic tracking-wide ml-1"
                  style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                >
                  {effectiveDriftThresholdHours === null
                    ? "— stays in orbit"
                    : "— planet drifts"}
                </span>
              </p>
              <div
                className="w-8 h-px shrink-0"
                style={{ background: `linear-gradient(to left, transparent, rgba(${r},${g},${b},0.15))` }}
              />
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
