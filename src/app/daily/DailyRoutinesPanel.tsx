"use client";

import {
  useMemo,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type CSSProperties,
  type DragEvent,
  type Dispatch,
  type PointerEvent,
  type SetStateAction,
} from "react";
import {
  clampDailyMinute,
  DAILY_ROUTINE_BLOCK_COLORS,
  DEFAULT_DAILY_ROUTINE_BLOCK_COLOR,
  normalizeDailyRoutineBlockColor,
  normalizeDailyRoutineBlockTitle,
  normalizeDailyRoutineName,
  type DailyChecklistItem,
  type DailyRoutine,
  type DailyRoutineBlock,
  type DailyRoutineBlockColor,
  type DailyRoutineBlockSubtask,
} from "@/lib/daily-alignment";
import {
  createDailyRoutine,
  createDailyRoutineBlock,
  createDailyRoutineBlockSubtask,
  deleteDailyRoutine,
  deleteDailyRoutineBlock,
  deleteDailyRoutineBlockSubtask,
  duplicateDailyRoutine,
  loadDailyRoutineBlockSubtaskCompletions,
  loadDailyRoutineSelection,
  reorderDailyRoutineBlockSubtasks,
  selectDailyRoutine,
  setDailyRoutineBlockChecklistItems,
  setDailyRoutineBlockSubtaskCompletion,
  updateDailyRoutineBlock,
  updateDailyRoutineBlockColor,
  updateDailyRoutineBlockSubtaskTitle,
  updateDailyRoutineName,
} from "./actions";

const SNAP_MINUTES = 15;
const PIXELS_PER_MINUTE = 1.6;
const DAY_MINUTES = 1440;
const DEFAULT_BLOCK_MINUTES = 60;
const MIN_BLOCK_MINUTES = 15;
const AUTOSCROLL_EDGE_SIZE = 72;
const BLOCK_VISUAL_GAP_PX = 3;
const TIMELINE_TOP_GUTTER_PX = 36;
const TIMELINE_BOTTOM_GUTTER_PX = 28;
const TIMELINE_RAIL_WIDTH_PX = 112;
const TIMELINE_BLOCK_LEFT_PX = TIMELINE_RAIL_WIDTH_PX + 20;
const TIMELINE_BLOCK_RIGHT_PX = 16;
const COMPARE_PIXELS_PER_MINUTE = 0.42;
const COMPARE_TOP_GUTTER_PX = 24;
const COMPARE_BOTTOM_GUTTER_PX = 20;
const COMPARE_RAIL_WIDTH_PX = 56;
const COMPARE_BLOCK_LEFT_PX = COMPARE_RAIL_WIDTH_PX + 10;
const COMPARE_HOUR_MARKS = [0, 360, 720, 1080, 1440];
const MOBILE_SUBTASK_SHEET_MEDIA = "(max-width: 1279px)";

type BlockColorStyle = {
  accent: string;
  bg: string;
  currentBg: string;
  pastBg: string;
  border: string;
  currentBorder: string;
  shadow: string;
  currentShadow: string;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

function hexToRgb(color: string): Rgb {
  const normalized = normalizeDailyRoutineBlockColor(color).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function blendHexColor(color: string, mixColor: string, amount: number) {
  const base = hexToRgb(color);
  const mix = hexToRgb(mixColor);
  return rgbToHex({
    r: base.r + (mix.r - base.r) * amount,
    g: base.g + (mix.g - base.g) * amount,
    b: base.b + (mix.b - base.b) * amount,
  });
}

function colorToRgba(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getBlockColorStyle(color: DailyRoutineBlockColor): BlockColorStyle {
  const bg = normalizeDailyRoutineBlockColor(color);
  const accent = blendHexColor(bg, "#ffffff", 0.34);
  return {
    accent,
    bg,
    currentBg: blendHexColor(bg, "#ffffff", 0.1),
    pastBg: blendHexColor(bg, "#000000", 0.28),
    border: colorToRgba(accent, 0.72),
    currentBorder: colorToRgba(blendHexColor(bg, "#ffffff", 0.5), 0.92),
    shadow: `0 10px 22px rgba(0,0,0,0.32), 0 0 0 1px ${colorToRgba(
      accent,
      0.14,
    )}`,
    currentShadow: `0 16px 34px rgba(0,0,0,0.42), 0 0 0 1px ${colorToRgba(
      accent,
      0.22,
    )}`,
  };
}

function getRotatingBlockColor(index: number): DailyRoutineBlockColor {
  return normalizeDailyRoutineBlockColor(
    DAILY_ROUTINE_BLOCK_COLORS[index % DAILY_ROUTINE_BLOCK_COLORS.length],
  );
}

type ColorPickerProps = {
  value: DailyRoutineBlockColor;
  onChange: (color: DailyRoutineBlockColor) => void;
  disabled?: boolean;
};

type SubtaskTitleFieldProps = {
  value: string;
  completed: boolean;
  className?: string;
  onSave: (value: string, field: HTMLTextAreaElement) => void;
};

function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  const normalizedColor = normalizeDailyRoutineBlockColor(value);
  const style = getBlockColorStyle(normalizedColor);

  return (
    <label
      className={`group grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 rounded-sm border bg-[#0d0f10] p-2.5 transition-colors sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] ${
        disabled
          ? "cursor-not-allowed opacity-45"
          : "cursor-pointer hover:bg-white/[0.045]"
      }`}
      style={{
        borderColor: disabled ? "rgba(255,255,255,0.12)" : style.border,
      }}
      >
        <span
          className="relative h-11 w-11 overflow-hidden rounded-sm border shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] sm:h-12 sm:w-12"
          style={{
            backgroundColor: normalizedColor,
            borderColor: style.currentBorder,
        }}
      >
        <input
          type="color"
          value={normalizedColor}
          disabled={disabled}
          onChange={(event) =>
            onChange(normalizeDailyRoutineBlockColor(event.currentTarget.value))
          }
          aria-label="Choose block color"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-300 transition-colors group-hover:text-white">
          Color wheel
        </span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          {normalizedColor}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="hidden h-8 w-8 rounded-full border border-white/20 shadow-[0_8px_18px_rgba(0,0,0,0.32)] sm:block"
        style={{
          background: `linear-gradient(135deg, ${style.accent}, ${style.bg})`,
        }}
      />
    </label>
  );
}

function SubtaskTitleField({
  value,
  completed,
  className = "",
  onSave,
}: SubtaskTitleFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={value}
      rows={1}
      onInput={resizeTextarea}
      onBlur={(event) => onSave(event.currentTarget.value, event.currentTarget)}
      className={`min-w-0 resize-none overflow-hidden whitespace-pre-wrap break-words rounded-sm border border-transparent bg-transparent outline-none transition-colors [overflow-wrap:anywhere] hover:border-white/[0.12] hover:bg-white/[0.035] focus:border-cyan-200/35 focus:bg-white/[0.045] ${
        completed ? "text-zinc-500 line-through" : "text-zinc-100"
      } ${className}`}
    />
  );
}

type DragMode = "move" | "start" | "end";
type SubtaskDropPosition = "before" | "after";

type DragState = {
  blockId: string;
  mode: DragMode;
  pointerId: number;
  grabOffsetMinute: number;
  startMinute: number;
  endMinute: number;
};

type SubtaskDropPreview = {
  subtaskId: string;
  position: SubtaskDropPosition;
};

type RoutineAllocation = {
  blockKey: string;
  title: string;
  color: DailyRoutineBlockColor;
  minutes: number;
  blockCount: number;
  firstStartMinute: number;
};

type DailyRoutinesPanelProps = {
  items: DailyChecklistItem[];
  routines: DailyRoutine[];
  setRoutines: Dispatch<SetStateAction<DailyRoutine[]>>;
  routineBlocks: DailyRoutineBlock[];
  setRoutineBlocks: Dispatch<SetStateAction<DailyRoutineBlock[]>>;
  activeDateKey: string;
  isActiveDateToday: boolean;
  activeCompletedIds: string[];
  onToggleCompletion: (item: DailyChecklistItem) => void;
};

let cachedMinute: number | null = null;

function getCurrentMinute() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getFreshMinute() {
  const nextMinute = getCurrentMinute();
  if (cachedMinute !== nextMinute) {
    cachedMinute = nextMinute;
  }
  return cachedMinute;
}

function subscribeToMinute(onStoreChange: () => void) {
  const intervalId = window.setInterval(() => {
    const nextMinute = getCurrentMinute();
    if (cachedMinute !== nextMinute) {
      cachedMinute = nextMinute;
      onStoreChange();
    }
  }, 30_000);

  return () => window.clearInterval(intervalId);
}

function getServerMinuteSnapshot() {
  return 0;
}

function sortRoutines(routines: DailyRoutine[]) {
  return [...routines].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

function sortBlocks(blocks: DailyRoutineBlock[]) {
  return [...blocks].sort(
    (a, b) =>
      a.startMinute - b.startMinute ||
      a.sortOrder - b.sortOrder ||
      a.title.localeCompare(b.title),
  );
}

function sortSubtasks(subtasks: DailyRoutineBlockSubtask[]) {
  return [...subtasks].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
  );
}

function reorderSubtasksByDrop(
  subtasks: DailyRoutineBlockSubtask[],
  draggedSubtaskId: string,
  targetSubtaskId: string,
  position: SubtaskDropPosition,
) {
  const sortedSubtasks = sortSubtasks(subtasks);
  const draggedSubtask = sortedSubtasks.find(
    (subtask) => subtask.id === draggedSubtaskId,
  );
  if (!draggedSubtask || draggedSubtaskId === targetSubtaskId) {
    return sortedSubtasks;
  }

  const remainingSubtasks = sortedSubtasks.filter(
    (subtask) => subtask.id !== draggedSubtaskId,
  );
  const targetIndex = remainingSubtasks.findIndex(
    (subtask) => subtask.id === targetSubtaskId,
  );
  if (targetIndex < 0) return sortedSubtasks;

  const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
  return [
    ...remainingSubtasks.slice(0, insertIndex),
    draggedSubtask,
    ...remainingSubtasks.slice(insertIndex),
  ].map((subtask, index) => ({
    ...subtask,
    sortOrder: index,
  }));
}

function sortItemsForPresets(items: DailyChecklistItem[]) {
  return [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
}

function getRoutineAllocations(blocks: DailyRoutineBlock[]): RoutineAllocation[] {
  const allocationsByKey = new Map<string, RoutineAllocation>();

  for (const block of blocks) {
    const minutes = Math.max(0, block.endMinute - block.startMinute);
    const existing = allocationsByKey.get(block.blockKey);
    if (existing) {
      existing.minutes += minutes;
      existing.blockCount += 1;
      existing.firstStartMinute = Math.min(existing.firstStartMinute, block.startMinute);
      continue;
    }

    allocationsByKey.set(block.blockKey, {
      blockKey: block.blockKey,
      title: block.title,
      color: block.color,
      minutes,
      blockCount: 1,
      firstStartMinute: block.startMinute,
    });
  }

  return Array.from(allocationsByKey.values()).sort(
    (a, b) => a.firstStartMinute - b.firstStartMinute || a.title.localeCompare(b.title),
  );
}

function minuteToTimeValue(minute: number) {
  const safeMinute = clampDailyMinute(minute);
  const hours = Math.floor(safeMinute / 60);
  const minutes = safeMinute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTimeValue(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatMinute(minute: number) {
  const safeMinute = clampDailyMinute(minute);
  const date = new Date(2026, 0, 1, Math.floor(safeMinute / 60), safeMinute % 60);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(startMinute: number, endMinute: number) {
  const duration = Math.max(0, endMinute - startMinute);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function snapMinute(value: number) {
  return clampDailyMinute(Math.round(value / SNAP_MINUTES) * SNAP_MINUTES);
}

function getTimelineTopForMinute(minute: number) {
  return TIMELINE_TOP_GUTTER_PX + minute * PIXELS_PER_MINUTE;
}

function getCompareTopForMinute(minute: number) {
  return COMPARE_TOP_GUTTER_PX + minute * COMPARE_PIXELS_PER_MINUTE;
}

function getSuggestedBlockRange(blocks: DailyRoutineBlock[]) {
  const sortedBlocks = sortBlocks(blocks);
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];
  return getBlockRangeFromStart(lastBlock ? lastBlock.endMinute : 540);
}

function getBlockRangeFromStart(
  startMinute: number,
  duration = DEFAULT_BLOCK_MINUTES,
) {
  const latestStart = DAY_MINUTES - MIN_BLOCK_MINUTES;
  const start = Math.min(latestStart, Math.max(0, snapMinute(startMinute)));
  const end = Math.min(DAY_MINUTES, Math.max(start + MIN_BLOCK_MINUTES, start + duration));
  return {
    startMinute: start,
    endMinute: end,
  };
}

function getBlockStatus(
  block: DailyRoutineBlock,
  currentMinute: number,
  isActiveDateToday: boolean,
) {
  if (!isActiveDateToday) return "neutral";
  if (currentMinute >= block.startMinute && currentMinute < block.endMinute) {
    return "current";
  }
  if (currentMinute >= block.endMinute) return "past";
  return "future";
}

function TimeGrid() {
  return (
    <>
      <div
        className="absolute inset-y-0 left-0 border-r border-white/[0.08] bg-black/20"
        style={{ width: `${TIMELINE_RAIL_WIDTH_PX}px` }}
        aria-hidden="true"
      />
      {Array.from({ length: 25 }, (_, hour) => (
        <div
          key={`hour-${hour}`}
          className="absolute left-0 right-0"
          style={{ top: `${getTimelineTopForMinute(hour * 60)}px` }}
          aria-hidden="true"
        >
          {hour < 24 ? (
            <span
              className="absolute left-0 whitespace-nowrap text-right font-mono text-[10px] leading-none tracking-[0.08em] text-zinc-500"
              style={{
                top: "-0.35rem",
                width: `${TIMELINE_RAIL_WIDTH_PX - 18}px`,
              }}
            >
              {formatMinute(hour * 60)}
            </span>
          ) : null}
          <span
            className="absolute right-0 border-t border-white/[0.095]"
            style={{ left: `${TIMELINE_RAIL_WIDTH_PX}px` }}
          />
        </div>
      ))}
      {Array.from({ length: 24 }, (_, hour) => (
        <div
          key={`half-${hour}`}
          className="absolute right-0 border-t border-white/[0.035]"
          style={{
            left: `${TIMELINE_RAIL_WIDTH_PX}px`,
            top: `${getTimelineTopForMinute(hour * 60 + 30)}px`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

function CheckGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
    >
      <path
        d="M3.2 8.4 6.5 11.4 12.8 4.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GripGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
    >
      <path
        d="M4 5h8M4 8h8M4 11h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RoutineAllocationList({
  blocks,
  compact = false,
}: {
  blocks: DailyRoutineBlock[];
  compact?: boolean;
}) {
  const allocations = getRoutineAllocations(blocks);
  const scheduledMinutes = allocations.reduce(
    (sum, allocation) => sum + allocation.minutes,
    0,
  );
  const openMinutes = Math.max(0, DAY_MINUTES - scheduledMinutes);
  const overbookedMinutes = Math.max(0, scheduledMinutes - DAY_MINUTES);
  const segmentMinutes = Math.max(DAY_MINUTES, scheduledMinutes);

  return (
    <section
      className={`border border-white/[0.10] bg-white/[0.025] ${
        compact
          ? "my-2 rounded-sm p-2 sm:border-x-0 sm:bg-transparent sm:px-0 sm:py-2"
          : "rounded-sm px-3 py-4 sm:rounded-none sm:border-x-0 sm:bg-transparent sm:px-0 sm:py-5"
      }`}
    >
      <div
        className={`mb-3 flex gap-2 ${
          compact
            ? "items-center justify-between"
            : "flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3"
        }`}
      >
        <p
          className={`font-mono uppercase text-zinc-300 ${
            compact
              ? "text-[8px] tracking-[0.18em]"
              : "text-[10px] tracking-[0.32em]"
          }`}
        >
          24h split
        </p>
        <span
          className={`font-mono uppercase text-zinc-500 ${
            compact
              ? "text-[8px] tracking-[0.12em]"
              : "text-[9px] tracking-[0.18em]"
          }`}
        >
          {formatDuration(0, Math.min(scheduledMinutes, DAY_MINUTES))} / 24h
        </span>
      </div>

      {allocations.length > 0 ? (
        <div className={compact ? "space-y-1.5" : "space-y-2 sm:space-y-2.5"}>
          <div
            className={`flex overflow-hidden rounded-full border border-white/[0.10] bg-black/25 sm:hidden ${
              compact ? "mb-2 h-1.5" : "mb-3 h-2.5"
            }`}
            aria-label="Routine allocation summary"
          >
            {allocations.map((allocation) => {
              const colorStyle = getBlockColorStyle(allocation.color);
              return (
                <span
                  key={`${allocation.blockKey}-segment`}
                  className="h-full flex-none"
                  title={`${allocation.title}: ${formatDuration(
                    0,
                    allocation.minutes,
                  )}`}
                  style={{
                    width: `${Math.max(
                      1.5,
                      (allocation.minutes / segmentMinutes) * 100,
                    )}%`,
                    backgroundColor: colorStyle.bg,
                  }}
                />
              );
            })}
            {openMinutes > 0 ? (
              <span
                className="h-full flex-none bg-white/12"
                title={`Open: ${formatDuration(0, openMinutes)}`}
                style={{
                  width: `${Math.max(
                    1.5,
                    (openMinutes / segmentMinutes) * 100,
                  )}%`,
                }}
              />
            ) : null}
          </div>

          {allocations.map((allocation) => {
            const colorStyle = getBlockColorStyle(allocation.color);
            const width = Math.min(
              100,
              Math.max(1.5, (allocation.minutes / DAY_MINUTES) * 100),
            );
            return (
              <div
                key={allocation.blockKey}
                className={`min-w-0 rounded-sm border border-white/[0.08] bg-black/18 sm:border-0 sm:bg-transparent ${
                  compact ? "px-2 py-1.5 sm:px-0 sm:py-0" : "px-2.5 py-2 sm:px-0 sm:py-0"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`min-w-0 truncate text-zinc-100 ${
                      compact ? "text-[10px]" : "text-sm"
                    }`}
                  >
                    {allocation.title}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-zinc-400 ${
                      compact
                        ? "text-[8px] tracking-[0.04em]"
                        : "text-[10px] tracking-[0.06em]"
                    }`}
                  >
                    {formatDuration(0, allocation.minutes)} / 24h
                  </span>
                </div>
                <div
                  className={`overflow-hidden rounded-full bg-white/[0.06] ${
                    compact ? "h-1" : "h-1.5"
                  }`}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${width}%`,
                      backgroundColor: colorStyle.accent,
                      boxShadow: `0 0 14px ${colorToRgba(colorStyle.accent, 0.32)}`,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {openMinutes > 0 ? (
            <div
              className={`min-w-0 rounded-sm border border-white/[0.07] bg-white/[0.018] sm:border-0 sm:bg-transparent ${
                compact ? "px-2 py-1.5 sm:px-0 sm:py-1" : "px-2.5 py-2 sm:px-0 sm:pt-1"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span
                  className={`min-w-0 truncate text-zinc-500 ${
                    compact ? "text-[10px]" : "text-sm"
                  }`}
                >
                  Open
                </span>
                <span
                  className={`shrink-0 font-mono text-zinc-600 ${
                    compact
                      ? "text-[8px] tracking-[0.04em]"
                      : "text-[10px] tracking-[0.06em]"
                  }`}
                >
                  {formatDuration(0, openMinutes)} / 24h
                </span>
              </div>
              <div
                className={`overflow-hidden rounded-full bg-white/[0.045] ${
                  compact ? "h-1" : "h-1.5"
                }`}
              >
                <span
                  className="block h-full rounded-full bg-white/15"
                  style={{
                    width: `${Math.max(1.5, (openMinutes / DAY_MINUTES) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {overbookedMinutes > 0 ? (
            <p
              className={`font-mono uppercase text-red-200/75 ${
                compact
                  ? "text-[8px] tracking-[0.12em]"
                  : "text-[9px] tracking-[0.16em]"
              }`}
            >
              +{formatDuration(0, overbookedMinutes)} over
            </p>
          ) : null}
        </div>
      ) : (
        <p
          className={`leading-6 text-zinc-500 ${
            compact ? "text-[10px]" : "text-sm"
          }`}
        >
          No scheduled blocks.
        </p>
      )}
    </section>
  );
}

type RoutineCompareBoardProps = {
  routines: DailyRoutine[];
  blocks: DailyRoutineBlock[];
  activeRoutineId: string | null;
  currentMinute: number;
  isActiveDateToday: boolean;
  onFocusRoutine: (routineId: string) => void;
};

function RoutineCompareBoard({
  routines,
  blocks,
  activeRoutineId,
  currentMinute,
  isActiveDateToday,
  onFocusRoutine,
}: RoutineCompareBoardProps) {
  const compareHeight =
    COMPARE_TOP_GUTTER_PX +
    DAY_MINUTES * COMPARE_PIXELS_PER_MINUTE +
    COMPARE_BOTTOM_GUTTER_PX;
  const compareGridStyle = {
    "--routine-count": Math.max(routines.length, 1),
  } as CSSProperties;

  return (
    <section className="overflow-x-auto overscroll-x-contain rounded-md border border-white/[0.12] bg-[#080909] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:p-3">
      <div
        className="grid min-w-[64rem] gap-3 [grid-template-columns:repeat(var(--routine-count),minmax(12.5rem,1fr))] sm:min-w-[58rem] sm:[grid-template-columns:repeat(var(--routine-count),minmax(11rem,1fr))]"
        style={compareGridStyle}
      >
        {routines.map((routine) => {
          const routineBlocks = sortBlocks(
            blocks.filter((block) => block.routineId === routine.id),
          );
          const active = routine.id === activeRoutineId;
          const totalMinutes = routineBlocks.reduce(
            (sum, block) => sum + Math.max(0, block.endMinute - block.startMinute),
            0,
          );

          return (
            <article
              key={routine.id}
              className={`min-w-0 rounded-sm border bg-black/28 p-2 transition-colors sm:p-2.5 ${
                active
                  ? "border-cyan-200/[0.42] shadow-[0_0_26px_rgba(103,232,249,0.10)]"
                  : "border-white/[0.09]"
              }`}
            >
              <button
                type="button"
                onClick={() => onFocusRoutine(routine.id)}
                className="mb-2 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-sm px-1 py-1 text-left transition-colors hover:bg-white/[0.035]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">
                    {routine.name}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                    {routineBlocks.length} blocks / {formatDuration(0, totalMinutes)}
                  </span>
                </span>
                <span
                  className={`rounded-sm border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.16em] ${
                    active
                      ? "border-cyan-100/40 bg-cyan-200/10 text-cyan-50"
                      : "border-white/[0.12] text-zinc-500"
                  }`}
                >
                  {active ? "Active" : "Focus"}
                </span>
              </button>

              <RoutineAllocationList blocks={routineBlocks} compact />

              <div
                className="relative overflow-hidden rounded-sm border border-white/[0.08] bg-[#050606]"
                style={{ height: `${compareHeight}px` }}
              >
                <div
                  className="absolute inset-y-0 left-0 border-r border-white/[0.07] bg-black/25"
                  style={{ width: `${COMPARE_RAIL_WIDTH_PX}px` }}
                  aria-hidden="true"
                />
                {COMPARE_HOUR_MARKS.map((minute) => (
                  <div
                    key={`${routine.id}-${minute}`}
                    className="absolute left-0 right-0"
                    style={{ top: `${getCompareTopForMinute(minute)}px` }}
                    aria-hidden="true"
                  >
                    {minute < DAY_MINUTES ? (
                      <span className="absolute -top-1.5 left-1 whitespace-nowrap text-right font-mono text-[8px] leading-none tracking-[0.05em] text-zinc-600">
                        {formatMinute(minute)}
                      </span>
                    ) : null}
                    <span
                      className="absolute right-0 border-t border-white/[0.075]"
                      style={{ left: `${COMPARE_RAIL_WIDTH_PX}px` }}
                    />
                  </div>
                ))}

                {isActiveDateToday ? (
                  <div
                    className="absolute right-0 z-30 border-t border-cyan-100/80"
                    style={{
                      left: `${COMPARE_RAIL_WIDTH_PX}px`,
                      top: `${getCompareTopForMinute(currentMinute)}px`,
                    }}
                  />
                ) : null}

                {routineBlocks.map((block) => {
                  const status = getBlockStatus(
                    block,
                    currentMinute,
                    isActiveDateToday,
                  );
                  const colorStyle = getBlockColorStyle(block.color);
                  const top =
                    getCompareTopForMinute(block.startMinute) +
                    BLOCK_VISUAL_GAP_PX;
                  const height = Math.max(
                    16,
                    (block.endMinute - block.startMinute) *
                      COMPARE_PIXELS_PER_MINUTE -
                      BLOCK_VISUAL_GAP_PX * 2,
                  );
                  const compact = height < 34;
                  const blockBackground =
                    status === "current"
                      ? colorStyle.currentBg
                      : status === "past"
                        ? colorStyle.pastBg
                        : colorStyle.bg;

                  return (
                    <div
                      key={block.id}
                      className="absolute right-2 z-10 overflow-hidden rounded-sm border px-2 py-1 text-white"
                      style={{
                        left: `${COMPARE_BLOCK_LEFT_PX}px`,
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: blockBackground,
                        borderColor:
                          status === "current"
                            ? colorStyle.currentBorder
                            : colorStyle.border,
                        boxShadow:
                          status === "current"
                            ? colorStyle.currentShadow
                            : colorStyle.shadow,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: colorStyle.accent }}
                      />
                      <span
                        className={`block truncate pl-1 font-semibold ${
                          compact ? "text-[10px]" : "text-xs"
                        }`}
                      >
                        {block.title}
                      </span>
                      {!compact ? (
                        <span className="mt-0.5 block truncate pl-1 font-mono text-[8px] uppercase tracking-[0.08em] text-white/76">
                          {formatMinute(block.startMinute)} -{" "}
                          {formatMinute(block.endMinute)}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function DailyRoutinesPanel({
  items,
  routines,
  setRoutines,
  routineBlocks,
  setRoutineBlocks,
  activeDateKey,
  isActiveDateToday,
  activeCompletedIds,
  onToggleCompletion,
}: DailyRoutinesPanelProps) {
  const currentMinute = useSyncExternalStore(
    subscribeToMinute,
    getFreshMinute,
    getServerMinuteSnapshot,
  );
  const [compareMode, setCompareMode] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [mobileSubtaskBlockId, setMobileSubtaskBlockId] = useState<string | null>(
    null,
  );
  const [routinePendingDeleteId, setRoutinePendingDeleteId] = useState<
    string | null
  >(null);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockStart, setNewBlockStart] = useState("09:00");
  const [newBlockEnd, setNewBlockEnd] = useState("10:00");
  const [newBlockColor, setNewBlockColor] = useState<DailyRoutineBlockColor>(
    DEFAULT_DAILY_ROUTINE_BLOCK_COLOR,
  );
  const [newSubtaskDrafts, setNewSubtaskDrafts] = useState<
    Record<string, string>
  >({});
  const [completedSubtaskIds, setCompletedSubtaskIds] = useState<string[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<string | null>(null);
  const [subtaskDropPreview, setSubtaskDropPreview] =
    useState<SubtaskDropPreview | null>(null);
  const [draggedPresetItemId, setDraggedPresetItemId] = useState<string | null>(
    null,
  );
  const [dropPreviewMinute, setDropPreviewMinute] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const routineBlocksRef = useRef(routineBlocks);
  const blockDragMovedRef = useRef(false);
  const suppressNextBlockClickRef = useRef(false);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineCanvasRef = useRef<HTMLDivElement | null>(null);

  const sortedRoutines = useMemo(() => sortRoutines(routines), [routines]);
  const activeRoutine =
    sortedRoutines.find((routine) => routine.id === selectedRoutineId) ??
    sortedRoutines[0] ??
    null;
  const blocksForActiveRoutine = useMemo(
    () =>
      activeRoutine
        ? sortBlocks(
            routineBlocks.filter((block) => block.routineId === activeRoutine.id),
          )
        : [],
    [activeRoutine, routineBlocks],
  );
  const activeBlock =
    blocksForActiveRoutine.find((block) => block.id === selectedBlockId) ??
    blocksForActiveRoutine[0] ??
    null;
  const newSubtaskTitle = activeBlock
    ? (newSubtaskDrafts[activeBlock.blockKey] ?? "")
    : "";
  const mobileSubtaskBlock = mobileSubtaskBlockId
    ? (blocksForActiveRoutine.find((block) => block.id === mobileSubtaskBlockId) ??
      null)
    : null;
  const mobileSubtaskTitle = mobileSubtaskBlock
    ? (newSubtaskDrafts[mobileSubtaskBlock.blockKey] ?? "")
    : "";
  const mobileSubtaskCompletedCount = mobileSubtaskBlock
    ? mobileSubtaskBlock.subtasks.filter((subtask) =>
        completedSubtaskIds.includes(subtask.id),
      ).length
    : 0;
  const presetItems = useMemo(
    () => sortItemsForPresets(items),
    [items],
  );
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const linkedItemsForActiveBlock = activeBlock
    ? activeBlock.checklistItemIds
        .map((itemId) => itemsById.get(itemId))
        .filter((item): item is DailyChecklistItem => Boolean(item))
    : [];

  useEffect(() => {
    routineBlocksRef.current = routineBlocks;
  }, [routineBlocks]);

  useEffect(() => {
    if (!activeDateKey) return;

    let cancelled = false;
    loadDailyRoutineBlockSubtaskCompletions(activeDateKey).then((ids) => {
      if (!cancelled) setCompletedSubtaskIds(ids);
    });

    return () => {
      cancelled = true;
    };
  }, [activeDateKey]);

  useEffect(() => {
    if (!mobileSubtaskBlock) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSubtaskBlockId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSubtaskBlock]);

  useEffect(() => {
    if (!activeDateKey) return;

    let cancelled = false;
    loadDailyRoutineSelection(activeDateKey).then((selection) => {
      if (!cancelled && selection?.routineId) {
        setSelectedRoutineId(selection.routineId);
        setSelectedBlockId(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeDateKey]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  function getTimelineMinuteFromClientY(clientY: number) {
    const canvas = timelineCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return snapMinute(
      (clientY - rect.top - TIMELINE_TOP_GUTTER_PX) / PIXELS_PER_MINUTE,
    );
  }

  function autoScrollTimeline(clientY: number) {
    if (clientY < AUTOSCROLL_EDGE_SIZE) {
      window.scrollBy({
        top: -Math.max(
          4,
          Math.round((AUTOSCROLL_EDGE_SIZE - clientY) / 3),
        ),
        behavior: "auto",
      });
    } else if (clientY > window.innerHeight - AUTOSCROLL_EDGE_SIZE) {
      window.scrollBy({
        top: Math.max(
          4,
          Math.round((clientY - (window.innerHeight - AUTOSCROLL_EDGE_SIZE)) / 3),
        ),
        behavior: "auto",
      });
    }
  }

  function scrollTimelineToMinute(minute: number) {
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;

    const canvasTop = canvas.getBoundingClientRect().top + window.scrollY;
    const targetTop =
      canvasTop + getTimelineTopForMinute(minute) - window.innerHeight / 2;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }

  function patchRoutine(nextRoutine: DailyRoutine) {
    setRoutines((current) =>
      sortRoutines(
        current.map((routine) =>
          routine.id === nextRoutine.id ? nextRoutine : routine,
        ),
      ),
    );
  }

  function patchBlock(nextBlock: DailyRoutineBlock) {
    setRoutineBlocks((current) =>
      current.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
    );
  }

  function patchSharedBlockSubtasks(
    blockKey: string,
    updater: (subtasks: DailyRoutineBlockSubtask[]) => DailyRoutineBlockSubtask[],
  ) {
    setRoutineBlocks((current) =>
      current.map((block) =>
        block.blockKey === blockKey
          ? {
              ...block,
              subtasks: sortSubtasks(updater(block.subtasks)),
            }
          : block,
      ),
    );
  }

  function patchBlockTimes(
    blockId: string,
    startMinute: number,
    endMinute: number,
  ) {
    setRoutineBlocks((current) =>
      current.map((block) =>
        block.id === blockId
          ? {
              ...block,
              startMinute,
              endMinute,
              sortOrder: startMinute,
            }
          : block,
      ),
    );
  }

  function handleSelectRoutine(routineId: string) {
    setSelectedRoutineId(routineId);
    setSelectedBlockId(null);
    setRoutinePendingDeleteId(null);
    clearMessages();
    if (!activeDateKey) return;

    startTransition(async () => {
      const result = await selectDailyRoutine(activeDateKey, routineId);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  function handleFocusComparedRoutine(routineId: string) {
    setCompareMode(false);
    setMobileSubtaskBlockId(null);
    handleSelectRoutine(routineId);
  }

  function openMobileSubtasks(blockId: string) {
    if (
      typeof window !== "undefined" &&
      window.matchMedia(MOBILE_SUBTASK_SHEET_MEDIA).matches
    ) {
      setMobileSubtaskBlockId(blockId);
    }
  }

  function handleSelectBlock(block: DailyRoutineBlock) {
    setSelectedBlockId(block.id);
    if (blockDragMovedRef.current || suppressNextBlockClickRef.current) {
      blockDragMovedRef.current = false;
      suppressNextBlockClickRef.current = false;
      return;
    }
    openMobileSubtasks(block.id);
  }

  function handleCycleRoutine(direction: -1 | 1) {
    if (sortedRoutines.length === 0) return;
    const currentIndex = Math.max(
      0,
      sortedRoutines.findIndex((routine) => routine.id === activeRoutine?.id),
    );
    const nextIndex =
      (currentIndex + direction + sortedRoutines.length) % sortedRoutines.length;
    handleSelectRoutine(sortedRoutines[nextIndex].id);
  }

  function handleCreateRoutine() {
    const name = normalizeDailyRoutineName(newRoutineName || "New routine");
    if (!name) return;
    clearMessages();
    startTransition(async () => {
      const result = await createDailyRoutine(name);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setRoutines((current) => sortRoutines([...current, result.routine]));
      setRoutineBlocks((current) => [...current, ...result.blocks]);
      setSelectedRoutineId(result.routine.id);
      setSelectedBlockId(null);
      setRoutinePendingDeleteId(null);
      setCompareMode(false);
      setNewRoutineName("");
      if (activeDateKey) {
        await selectDailyRoutine(activeDateKey, result.routine.id);
      }
      setNotice("Routine created.");
    });
  }

  function handleDuplicateRoutine(routine: DailyRoutine) {
    clearMessages();
    startTransition(async () => {
      const result = await duplicateDailyRoutine(routine.id);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setRoutines((current) => sortRoutines([...current, result.routine]));
      setRoutineBlocks((current) => [...current, ...result.blocks]);
      setSelectedRoutineId(result.routine.id);
      setSelectedBlockId(result.blocks[0]?.id ?? null);
      setRoutinePendingDeleteId(null);
      setCompareMode(false);
      if (activeDateKey) {
        await selectDailyRoutine(activeDateKey, result.routine.id);
      }
      setNotice("Routine copied.");
    });
  }

  function handleSaveRoutineName(routine: DailyRoutine, name: string) {
    const normalizedName = normalizeDailyRoutineName(name);
    if (!normalizedName) {
      setError("Routine name is required.");
      return;
    }
    if (normalizedName === routine.name) return;
    clearMessages();
    startTransition(async () => {
      const result = await updateDailyRoutineName(routine.id, normalizedName);
      if (!result.success) {
        setError(result.error);
        return;
      }

      patchRoutine(result.routine);
    });
  }

  function handleDeleteRoutine(routine: DailyRoutine) {
    clearMessages();
    if (routinePendingDeleteId !== routine.id) {
      setRoutinePendingDeleteId(routine.id);
      return;
    }

    setRoutinePendingDeleteId(null);
    setRoutines((current) =>
      current.filter((currentRoutine) => currentRoutine.id !== routine.id),
    );
    setRoutineBlocks((current) =>
      current.filter((block) => block.routineId !== routine.id),
    );
    if (selectedRoutineId === routine.id) {
      setSelectedRoutineId(null);
      setSelectedBlockId(null);
    }
    startTransition(async () => {
      const result = await deleteDailyRoutine(routine.id);
      if (!result.success) {
        setError(result.error);
        setRoutines((current) => sortRoutines([...current, routine]));
      }
    });
  }

  function handleCreateBlock() {
    if (!activeRoutine) return;
    const startMinute = parseTimeValue(newBlockStart);
    const endMinute = parseTimeValue(newBlockEnd);
    const title = normalizeDailyRoutineBlockTitle(newBlockTitle || "New block");
    if (startMinute === null || endMinute === null) {
      setError("Choose a valid time.");
      return;
    }
    if (!title) {
      setError("Block title is required.");
      return;
    }
    if (endMinute - startMinute < MIN_BLOCK_MINUTES) {
      setError("Blocks must be at least 15 minutes.");
      return;
    }

    clearMessages();
    startTransition(async () => {
      const result = await createDailyRoutineBlock(
        activeRoutine.id,
        title,
        startMinute,
        endMinute,
        newBlockColor,
      );
      if (!result.success) {
        setError(result.error);
        return;
      }

      setRoutineBlocks((current) => [...current, result.block]);
      setSelectedBlockId(result.block.id);
      const nextStart = result.block.endMinute;
      const nextEnd = Math.min(1440, nextStart + 60);
      setNewBlockTitle("");
      setNewBlockStart(minuteToTimeValue(nextStart >= 1440 ? startMinute : nextStart));
      setNewBlockEnd(minuteToTimeValue(nextStart >= 1440 ? endMinute : nextEnd));
      setNewBlockColor(getRotatingBlockColor(blocksForActiveRoutine.length + 1));
    });
  }

  function handleCreatePresetBlock(
    item: DailyChecklistItem,
    placedStartMinute?: number,
  ) {
    if (!activeRoutine) return;

    const range =
      typeof placedStartMinute === "number"
        ? getBlockRangeFromStart(placedStartMinute)
        : getSuggestedBlockRange(blocksForActiveRoutine);
    const title = normalizeDailyRoutineBlockTitle(item.label) || "Focus block";
    const color = getRotatingBlockColor(
      blocksForActiveRoutine.length + item.sortOrder,
    );
    clearMessages();
    startTransition(async () => {
      const blockResult = await createDailyRoutineBlock(
        activeRoutine.id,
        title,
        range.startMinute,
        range.endMinute,
        color,
      );
      if (!blockResult.success) {
        setError(blockResult.error);
        return;
      }

      const nextBlock = {
        ...blockResult.block,
        checklistItemIds: [item.id],
      };
      setRoutineBlocks((current) => [...current, nextBlock]);
      setSelectedBlockId(nextBlock.id);

      const linkResult = await setDailyRoutineBlockChecklistItems(nextBlock.id, [
        item.id,
      ]);
      if (!linkResult.success) {
        setError(linkResult.error);
        patchBlock(blockResult.block);
        return;
      }

      patchBlock({
        ...nextBlock,
        checklistItemIds: linkResult.itemIds,
      });
      scrollTimelineToMinute(nextBlock.startMinute);
      setNotice("Preset block added.");
    });
  }

  function handleUseNextOpenTime() {
    const range = getSuggestedBlockRange(blocksForActiveRoutine);
    setNewBlockStart(minuteToTimeValue(range.startMinute));
    setNewBlockEnd(minuteToTimeValue(range.endMinute));
  }

  function handleSaveBlock(
    block: DailyRoutineBlock,
    title: string,
    startMinute: number,
    endMinute: number,
  ) {
    const normalizedTitle = normalizeDailyRoutineBlockTitle(title);
    if (!normalizedTitle) {
      setError("Block title is required.");
      return;
    }
    if (endMinute - startMinute < MIN_BLOCK_MINUTES) {
      setError("Blocks must be at least 15 minutes.");
      return;
    }

    const nextBlock = {
      ...block,
      title: normalizedTitle,
      startMinute,
      endMinute,
      sortOrder: startMinute,
    };
    patchBlock(nextBlock);
    clearMessages();
    startTransition(async () => {
      const result = await updateDailyRoutineBlock(
        block.id,
        normalizedTitle,
        startMinute,
        endMinute,
      );
      if (!result.success) {
        setError(result.error);
        patchBlock(block);
        return;
      }

      patchBlock(result.block);
    });
  }

  function handleChangeBlockColor(
    block: DailyRoutineBlock,
    color: DailyRoutineBlockColor,
  ) {
    if (block.color === color) return;

    const nextBlock = {
      ...block,
      color,
    };
    patchBlock(nextBlock);
    clearMessages();
    startTransition(async () => {
      const result = await updateDailyRoutineBlockColor(block.id, color);
      if (!result.success) {
        setError(result.error);
        patchBlock(block);
        return;
      }

      patchBlock(result.block);
    });
  }

  function handleDeleteBlock(block: DailyRoutineBlock) {
    clearMessages();
    setRoutineBlocks((current) =>
      current.filter((currentBlock) => currentBlock.id !== block.id),
    );
    if (selectedBlockId === block.id) setSelectedBlockId(null);
    startTransition(async () => {
      const result = await deleteDailyRoutineBlock(block.id);
      if (!result.success) {
        setError(result.error);
        setRoutineBlocks((current) => [...current, block]);
      }
    });
  }

  function handleAddSubtask(block: DailyRoutineBlock) {
    const title = (newSubtaskDrafts[block.blockKey] ?? "").trim();
    if (!title) return;

    clearMessages();
    startTransition(async () => {
      const result = await createDailyRoutineBlockSubtask(block.id, title);
      if (!result.success) {
        setError(result.error);
        return;
      }

      patchSharedBlockSubtasks(result.subtask.blockKey, (subtasks) =>
        [...subtasks, result.subtask].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
        ),
      );
      setNewSubtaskDrafts((current) => ({
        ...current,
        [block.blockKey]: "",
      }));
    });
  }

  function handleSaveSubtaskTitle(
    block: DailyRoutineBlock,
    subtask: DailyRoutineBlockSubtask,
    title: string,
    input: HTMLInputElement | HTMLTextAreaElement,
  ) {
    const normalizedTitle = title.trim().replace(/\s+/g, " ").slice(0, 140);
    if (!normalizedTitle) {
      input.value = subtask.title;
      setError("Subtask is required.");
      return;
    }
    if (normalizedTitle === subtask.title) {
      input.value = subtask.title;
      return;
    }

    patchSharedBlockSubtasks(subtask.blockKey, (subtasks) =>
      subtasks.map((currentSubtask) =>
        currentSubtask.id === subtask.id
          ? { ...currentSubtask, title: normalizedTitle }
          : currentSubtask,
      ),
    );
    clearMessages();
    startTransition(async () => {
      const result = await updateDailyRoutineBlockSubtaskTitle(
        subtask.id,
        normalizedTitle,
      );
      if (!result.success) {
        setError(result.error);
        input.value = subtask.title;
        patchSharedBlockSubtasks(subtask.blockKey, (subtasks) =>
          subtasks.map((currentSubtask) =>
            currentSubtask.id === subtask.id ? subtask : currentSubtask,
          ),
        );
        return;
      }

      input.value = result.subtask.title;
      patchSharedBlockSubtasks(result.subtask.blockKey, (subtasks) =>
        subtasks.map((currentSubtask) =>
          currentSubtask.id === result.subtask.id ? result.subtask : currentSubtask,
        ),
      );
    });
  }

  function handleDeleteSubtask(
    block: DailyRoutineBlock,
    subtask: DailyRoutineBlockSubtask,
  ) {
    patchSharedBlockSubtasks(subtask.blockKey, (subtasks) =>
      subtasks.filter((currentSubtask) => currentSubtask.id !== subtask.id),
    );
    setCompletedSubtaskIds((current) =>
      current.filter((subtaskId) => subtaskId !== subtask.id),
    );
    clearMessages();
    startTransition(async () => {
      const result = await deleteDailyRoutineBlockSubtask(subtask.id);
      if (!result.success) {
        setError(result.error);
        patchSharedBlockSubtasks(subtask.blockKey, (subtasks) =>
          [...subtasks, subtask].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
          ),
        );
      }
    });
  }

  function handleSubtaskDragStart(
    event: DragEvent<HTMLDivElement>,
    subtask: DailyRoutineBlockSubtask,
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-axis-subtask", subtask.id);
    setDraggedSubtaskId(subtask.id);
  }

  function handleSubtaskDragOver(
    event: DragEvent<HTMLDivElement>,
    subtask: DailyRoutineBlockSubtask,
  ) {
    if (!draggedSubtaskId || draggedSubtaskId === subtask.id) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const position =
      event.clientY > rect.top + rect.height / 2 ? "after" : "before";
    setSubtaskDropPreview({
      subtaskId: subtask.id,
      position,
    });
  }

  function clearSubtaskDrag() {
    setDraggedSubtaskId(null);
    setSubtaskDropPreview(null);
  }

  function handleSubtaskDrop(
    event: DragEvent<HTMLDivElement>,
    block: DailyRoutineBlock,
    targetSubtask: DailyRoutineBlockSubtask,
  ) {
    event.preventDefault();
    const draggedId =
      event.dataTransfer.getData("application/x-axis-subtask") ||
      draggedSubtaskId;
    const position = subtaskDropPreview?.position ?? "before";
    clearSubtaskDrag();
    if (!draggedId || draggedId === targetSubtask.id) return;

    const previousSubtasks = sortSubtasks(block.subtasks);
    const nextSubtasks = reorderSubtasksByDrop(
      previousSubtasks,
      draggedId,
      targetSubtask.id,
      position,
    );
    if (nextSubtasks.map((subtask) => subtask.id).join("|") ===
      previousSubtasks.map((subtask) => subtask.id).join("|")) {
      return;
    }

    patchSharedBlockSubtasks(block.blockKey, () => nextSubtasks);
    clearMessages();
    startTransition(async () => {
      const result = await reorderDailyRoutineBlockSubtasks(
        block.id,
        nextSubtasks.map((subtask) => subtask.id),
      );
      if (!result.success) {
        setError(result.error);
        patchSharedBlockSubtasks(block.blockKey, () => previousSubtasks);
        return;
      }

      patchSharedBlockSubtasks(block.blockKey, () => result.subtasks);
    });
  }

  function handleMoveSubtask(
    block: DailyRoutineBlock,
    subtask: DailyRoutineBlockSubtask,
    direction: -1 | 1,
  ) {
    const previousSubtasks = sortSubtasks(block.subtasks);
    const currentIndex = previousSubtasks.findIndex(
      (currentSubtask) => currentSubtask.id === subtask.id,
    );
    const nextIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= previousSubtasks.length
    ) {
      return;
    }

    const nextSubtasks = [...previousSubtasks];
    const [movedSubtask] = nextSubtasks.splice(currentIndex, 1);
    nextSubtasks.splice(nextIndex, 0, movedSubtask);
    const orderedSubtasks = nextSubtasks.map((currentSubtask, index) => ({
      ...currentSubtask,
      sortOrder: index,
    }));

    patchSharedBlockSubtasks(block.blockKey, () => orderedSubtasks);
    clearMessages();
    startTransition(async () => {
      const result = await reorderDailyRoutineBlockSubtasks(
        block.id,
        orderedSubtasks.map((currentSubtask) => currentSubtask.id),
      );
      if (!result.success) {
        setError(result.error);
        patchSharedBlockSubtasks(block.blockKey, () => previousSubtasks);
        return;
      }

      patchSharedBlockSubtasks(block.blockKey, () => result.subtasks);
    });
  }

  function handleToggleSubtask(subtask: DailyRoutineBlockSubtask) {
    if (!activeDateKey) return;

    const completed = completedSubtaskIds.includes(subtask.id);
    const nextIds = completed
      ? completedSubtaskIds.filter((subtaskId) => subtaskId !== subtask.id)
      : [...completedSubtaskIds, subtask.id];

    setCompletedSubtaskIds(nextIds);
    clearMessages();
    startTransition(async () => {
      const result = await setDailyRoutineBlockSubtaskCompletion(
        subtask.id,
        activeDateKey,
        !completed,
      );
      if (!result.success) {
        setError(result.error);
        setCompletedSubtaskIds(completedSubtaskIds);
      }
    });
  }

  function handleToggleLinkedItem(block: DailyRoutineBlock, itemId: string) {
    const linked = block.checklistItemIds.includes(itemId);
    const nextItemIds = linked
      ? block.checklistItemIds.filter((currentItemId) => currentItemId !== itemId)
      : [...block.checklistItemIds, itemId];

    patchBlock({
      ...block,
      checklistItemIds: nextItemIds,
    });
    clearMessages();
    startTransition(async () => {
      const result = await setDailyRoutineBlockChecklistItems(block.id, nextItemIds);
      if (!result.success) {
        setError(result.error);
        patchBlock(block);
        return;
      }

      patchBlock({
        ...block,
        checklistItemIds: result.itemIds,
      });
    });
  }

  function startDrag(
    event: PointerEvent<HTMLElement>,
    block: DailyRoutineBlock,
    mode: DragMode,
  ) {
    event.preventDefault();
    event.stopPropagation();
    blockDragMovedRef.current = false;
    suppressNextBlockClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerMinute = getTimelineMinuteFromClientY(event.clientY);
    setSelectedBlockId(block.id);
    setDrag({
      blockId: block.id,
      mode,
      pointerId: event.pointerId,
      grabOffsetMinute:
        pointerMinute === null ? 0 : pointerMinute - block.startMinute,
      startMinute: block.startMinute,
      endMinute: block.endMinute,
    });
  }

  function updateDrag(clientY: number) {
    if (!drag) return;
    autoScrollTimeline(clientY);
    const pointerMinute = getTimelineMinuteFromClientY(clientY);
    if (pointerMinute === null) return;

    let nextStart = drag.startMinute;
    let nextEnd = drag.endMinute;
    const duration = drag.endMinute - drag.startMinute;

    if (drag.mode === "move") {
      nextStart = snapMinute(pointerMinute - drag.grabOffsetMinute);
      nextStart = Math.min(1440 - duration, Math.max(0, nextStart));
      nextEnd = nextStart + duration;
    } else if (drag.mode === "start") {
      nextStart = snapMinute(pointerMinute);
      nextStart = Math.max(0, Math.min(nextStart, drag.endMinute - MIN_BLOCK_MINUTES));
    } else {
      nextEnd = snapMinute(pointerMinute);
      nextEnd = Math.min(1440, Math.max(nextEnd, drag.startMinute + MIN_BLOCK_MINUTES));
    }

    if (nextStart !== drag.startMinute || nextEnd !== drag.endMinute) {
      blockDragMovedRef.current = true;
    }
    patchBlockTimes(drag.blockId, nextStart, nextEnd);
  }

  function finishDrag() {
    if (!drag) return;
    const draggedBlock = routineBlocksRef.current.find(
      (block) => block.id === drag.blockId,
    );
    const didMove = blockDragMovedRef.current;
    const shouldOpenMobileSubtasks = drag.mode === "move" && !didMove;
    suppressNextBlockClickRef.current = didMove || shouldOpenMobileSubtasks;
    blockDragMovedRef.current = false;
    setDrag(null);
    if (!draggedBlock) return;
    if (shouldOpenMobileSubtasks) {
      openMobileSubtasks(draggedBlock.id);
      return;
    }
    if (!didMove) {
      return;
    }

    handleSaveBlock(
      draggedBlock,
      draggedBlock.title,
      draggedBlock.startMinute,
      draggedBlock.endMinute,
    );
  }

  function handleBlockPointerMove(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    updateDrag(event.clientY);
  }

  function handleBlockPointerEnd(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
    finishDrag();
  }

  function handlePresetDragStart(
    event: DragEvent<HTMLButtonElement>,
    item: DailyChecklistItem,
  ) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-axis-focus-item", item.id);
    event.dataTransfer.setData("text/plain", item.label);
    setDraggedPresetItemId(item.id);
    clearMessages();
  }

  function handlePresetDragOver(event: DragEvent<HTMLDivElement>) {
    if (!activeRoutine || !draggedPresetItemId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    autoScrollTimeline(event.clientY);
    setDropPreviewMinute(getTimelineMinuteFromClientY(event.clientY));
  }

  function handlePresetDragLeave(event: DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }
    setDropPreviewMinute(null);
  }

  function handlePresetDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const itemId =
      event.dataTransfer.getData("application/x-axis-focus-item") ||
      draggedPresetItemId;
    const item = presetItems.find((presetItem) => presetItem.id === itemId);
    const startMinute = getTimelineMinuteFromClientY(event.clientY);
    setDraggedPresetItemId(null);
    setDropPreviewMinute(null);
    if (!item || startMinute === null) return;

    handleCreatePresetBlock(item, startMinute);
  }

  const timelineHeight =
    TIMELINE_TOP_GUTTER_PX +
    DAY_MINUTES * PIXELS_PER_MINUTE +
    TIMELINE_BOTTOM_GUTTER_PX;

  return (
    <section className="min-w-0">
      <div className="mb-6 flex flex-col gap-4 lg:mb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.32em] text-cyan-200/90 sm:tracking-[0.42em]">
            Routine mode
          </p>
          <h1
            className="text-3xl font-light tracking-tight text-zinc-100 sm:text-5xl"
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            Day Architecture
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-zinc-300">
            Pick the routine that fits today, then run the focus list from inside
            the time blocks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => handleCycleRoutine(-1)}
            disabled={sortedRoutines.length < 2 || isPending}
            className="h-10 w-10 cursor-pointer rounded-sm border border-white/[0.16] text-zinc-300 transition-colors hover:border-cyan-200/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:h-9 sm:w-9"
            aria-label="Previous routine"
          >
            &lt;
          </button>
          <button
            type="button"
            onClick={() => handleCycleRoutine(1)}
            disabled={sortedRoutines.length < 2 || isPending}
            className="h-10 w-10 cursor-pointer rounded-sm border border-white/[0.16] text-zinc-300 transition-colors hover:border-cyan-200/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:h-9 sm:w-9"
            aria-label="Next routine"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 border-y border-white/[0.09] py-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto pb-1">
          {sortedRoutines.length > 0 ? (
            sortedRoutines.map((routine) => {
              const active = activeRoutine?.id === routine.id;
              return (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => handleSelectRoutine(routine.id)}
                  className={`min-h-12 shrink-0 snap-start cursor-pointer rounded-sm border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-cyan-200/45 bg-cyan-200/[0.10] text-white shadow-[0_0_22px_rgba(103,232,249,0.08)]"
                      : "border-white/[0.13] bg-white/[0.035] text-zinc-300 hover:border-white/24 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className="block text-[10px] font-mono uppercase tracking-[0.22em]">
                    {routine.name}
                  </span>
                  {active ? (
                    <span className="mt-1 block text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-100/80">
                      {selectedRoutineId === routine.id ? "selected today" : "preview"}
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="py-2 text-sm text-zinc-400">
              No routines yet.
            </p>
          )}
        </div>

        <div className="flex w-full min-w-0 gap-2 lg:w-auto">
          <input
            value={newRoutineName}
            onChange={(event) => setNewRoutineName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreateRoutine();
            }}
            placeholder="New routine"
            className="min-h-11 min-w-0 flex-1 rounded-sm border border-white/[0.14] bg-white/[0.045] px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 hover:border-white/22 focus:border-cyan-200/40 lg:w-44"
          />
          <button
            type="button"
            onClick={handleCreateRoutine}
            disabled={isPending}
            className="min-h-11 cursor-pointer rounded-sm border border-white/[0.16] bg-white/[0.035] px-3 py-2 text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-200 transition-colors hover:border-cyan-200/35 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            Add
          </button>
        </div>
      </div>

      {activeRoutine ? (
        <div
          className={
            compareMode
              ? "space-y-6"
              : "flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start"
          }
        >
          <div className="order-2 min-w-0 xl:order-none">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <label className="mb-2 block text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-400">
                  {compareMode ? "Compare mode" : "Routine name"}
                </label>
                {compareMode ? (
                  <div className="text-2xl font-light text-white">
                    All routines
                  </div>
                ) : (
                  <input
                    key={activeRoutine.id}
                    defaultValue={activeRoutine.name}
                    onBlur={(event) =>
                      handleSaveRoutineName(activeRoutine, event.currentTarget.value)
                    }
                    className="w-full min-w-0 bg-transparent text-2xl font-light text-white outline-none transition-colors focus:text-cyan-50"
                  />
                )}
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRoutinePendingDeleteId(null);
                    setCompareMode((current) => !current);
                  }}
                  className={`min-h-10 flex-1 cursor-pointer rounded-sm border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.22em] transition-colors sm:flex-none ${
                    compareMode
                      ? "border-cyan-100/40 bg-cyan-200/[0.12] text-cyan-50 hover:border-cyan-100/60"
                      : "border-white/[0.16] bg-white/[0.04] text-zinc-200 hover:border-cyan-200/35 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {compareMode ? "Focus" : "Compare"}
                </button>
                {!compareMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollTimelineToMinute(currentMinute)}
                      disabled={!isActiveDateToday}
                      className="min-h-10 flex-1 cursor-pointer rounded-sm border border-cyan-200/20 bg-cyan-200/[0.055] px-3 py-2 text-[9px] font-mono uppercase tracking-[0.22em] text-cyan-100/80 transition-colors hover:border-cyan-100/40 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
                    >
                      Now
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateRoutine(activeRoutine)}
                      disabled={isPending}
                      className="min-h-10 flex-1 cursor-pointer rounded-sm border border-white/[0.16] bg-white/[0.04] px-3 py-2 text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-200 transition-colors hover:border-cyan-200/35 hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
                    >
                      Copy
                    </button>
                    {routinePendingDeleteId === activeRoutine.id ? (
                      <div className="flex items-center gap-1 rounded-sm border border-red-300/25 bg-red-300/[0.055] p-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteRoutine(activeRoutine)}
                          disabled={isPending}
                          className="min-h-9 cursor-pointer rounded-sm bg-red-300/14 px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-red-100 transition-colors hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoutinePendingDeleteId(null)}
                          disabled={isPending}
                          className="min-h-9 cursor-pointer rounded-sm px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:bg-white/[0.055] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteRoutine(activeRoutine)}
                        disabled={isPending}
                        className="min-h-10 flex-1 cursor-pointer rounded-sm border border-red-300/20 bg-red-300/[0.035] px-3 py-2 text-[9px] font-mono uppercase tracking-[0.22em] text-red-200/75 transition-colors hover:border-red-200/40 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
                      >
                        Delete
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            {compareMode ? (
              <RoutineCompareBoard
                routines={sortedRoutines}
                blocks={routineBlocks}
                activeRoutineId={activeRoutine.id}
                currentMinute={currentMinute}
                isActiveDateToday={isActiveDateToday}
                onFocusRoutine={handleFocusComparedRoutine}
              />
            ) : (
              <div
                ref={timelineScrollRef}
                className={`relative overflow-x-auto rounded-md border border-white/[0.12] bg-[#080909] shadow-[0_24px_70px_rgba(0,0,0,0.42)] ${
                  draggedPresetItemId ? "ring-1 ring-cyan-100/30" : ""
                }`}
                onPointerMove={(event) => {
                  if (drag) updateDrag(event.clientY);
                }}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                onDragOver={handlePresetDragOver}
                onDragLeave={handlePresetDragLeave}
                onDrop={handlePresetDrop}
              >
                <div
                  ref={timelineCanvasRef}
                  className="relative min-h-[64rem] min-w-[34rem] sm:min-w-0"
                  style={{ height: `${timelineHeight}px` }}
                >
                  <TimeGrid />
                  {isActiveDateToday ? (
                  <div
                    className="absolute right-0 z-30 border-t border-cyan-100/90"
                    style={{
                      left: `${TIMELINE_RAIL_WIDTH_PX}px`,
                      top: `${getTimelineTopForMinute(currentMinute)}px`,
                    }}
                  >
                    <span className="absolute -top-3 right-2 rounded-sm bg-cyan-200/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-50">
                      now
                    </span>
                  </div>
                ) : null}
                  {dropPreviewMinute !== null ? (
                  <div
                    className="pointer-events-none absolute right-3 z-30 border-t border-amber-200/85"
                    style={{
                      left: `${TIMELINE_RAIL_WIDTH_PX}px`,
                      top: `${getTimelineTopForMinute(dropPreviewMinute)}px`,
                    }}
                  >
                    <span className="absolute -top-3 left-3 rounded-sm border border-amber-100/30 bg-amber-200/15 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-50">
                      {formatMinute(dropPreviewMinute)}
                    </span>
                  </div>
                ) : null}
                  {blocksForActiveRoutine.map((block) => {
                  const status = getBlockStatus(
                    block,
                    currentMinute,
                    isActiveDateToday,
                  );
                  const top = getTimelineTopForMinute(block.startMinute);
                  const durationMinutes = block.endMinute - block.startMinute;
                  const rawHeight = durationMinutes * PIXELS_PER_MINUTE;
                  const visualTop = top + BLOCK_VISUAL_GAP_PX;
                  const height = Math.max(
                    10,
                    rawHeight - BLOCK_VISUAL_GAP_PX * 2,
                  );
                  const compactBlock = height < 48;
                  const tinyBlock = height < 28;
                  const subtaskCount = block.subtasks.length;
                  const completedBlockSubtasks = block.subtasks.filter((subtask) =>
                    completedSubtaskIds.includes(subtask.id),
                  ).length;
                  const resizeHandleClass = tinyBlock
                    ? "h-1"
                    : compactBlock
                      ? "h-1.5"
                      : "h-3";
                  const moveButtonClass = compactBlock
                    ? "flex h-full w-full touch-none cursor-grab flex-col justify-start gap-1 px-3 py-1.5 text-left active:cursor-grabbing"
                    : "flex h-full w-full touch-none cursor-grab flex-col justify-start gap-1.5 px-4 py-2.5 text-left active:cursor-grabbing";
                  const selected = activeBlock?.id === block.id;
                  const colorStyle = getBlockColorStyle(block.color);
                  const blockBackground =
                    status === "current"
                      ? colorStyle.currentBg
                      : status === "past"
                        ? colorStyle.pastBg
                        : colorStyle.bg;
                  const blockBorder =
                    selected || status === "current"
                      ? colorStyle.currentBorder
                      : colorStyle.border;
                  const blockShadow =
                    drag?.blockId === block.id || status === "current"
                      ? colorStyle.currentShadow
                      : colorStyle.shadow;
                  return (
                    <div
                      key={block.id}
                      className={`absolute z-10 overflow-hidden rounded-sm border transition-all hover:brightness-110 ${
                        selected ? "ring-1 ring-white/55" : ""
                      } ${
                        drag?.blockId === block.id ? "scale-[1.008]" : ""
                      }`}
                      style={{
                        left: `${TIMELINE_BLOCK_LEFT_PX}px`,
                        right: `${TIMELINE_BLOCK_RIGHT_PX}px`,
                        top: `${visualTop}px`,
                        height: `${height}px`,
                        backgroundColor: blockBackground,
                        borderColor: blockBorder,
                        boxShadow: blockShadow,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1"
                        style={{
                          backgroundColor: colorStyle.accent,
                        }}
                      />
                      <button
                        type="button"
                        aria-label={`Resize start of ${block.title}`}
                        onPointerDown={(event) => startDrag(event, block, "start")}
                        onPointerMove={handleBlockPointerMove}
                        onPointerUp={handleBlockPointerEnd}
                        onPointerCancel={handleBlockPointerEnd}
                        className={`absolute inset-x-0 top-0 z-20 touch-none cursor-ns-resize bg-transparent transition-colors hover:bg-white/15 ${resizeHandleClass}`}
                      />
                      <button
                        type="button"
                        onPointerDown={(event) => startDrag(event, block, "move")}
                        onPointerMove={handleBlockPointerMove}
                        onPointerUp={handleBlockPointerEnd}
                        onPointerCancel={handleBlockPointerEnd}
                        onClick={() => handleSelectBlock(block)}
                        className={moveButtonClass}
                      >
                        <span className="flex min-w-0 items-center justify-between gap-3">
                          <span
                            className={`min-w-0 truncate font-semibold text-white ${
                              tinyBlock
                                ? "text-[11px]"
                                : compactBlock
                                  ? "text-[13px]"
                                  : "text-[15px]"
                            }`}
                          >
                            {block.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {subtaskCount > 0 ? (
                              <span
                                className={`rounded-sm border border-white/24 bg-black/20 font-mono font-semibold text-white ${
                                  tinyBlock
                                    ? "px-1 py-0 text-[8px]"
                                    : "px-1.5 py-0.5 text-[9px]"
                                }`}
                                aria-label={`${subtaskCount} subtasks`}
                              >
                                {completedBlockSubtasks > 0
                                  ? `${completedBlockSubtasks}/${subtaskCount}`
                                  : subtaskCount}
                              </span>
                            ) : null}
                            <span
                              className={`font-mono tracking-[0.06em] text-white/82 ${
                                tinyBlock ? "text-[8px]" : "text-[10px]"
                              }`}
                            >
                              {formatMinute(block.startMinute)} -{" "}
                              {formatMinute(block.endMinute)}
                            </span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Resize end of ${block.title}`}
                        onPointerDown={(event) => startDrag(event, block, "end")}
                        onPointerMove={handleBlockPointerMove}
                        onPointerUp={handleBlockPointerEnd}
                        onPointerCancel={handleBlockPointerEnd}
                        className={`absolute inset-x-0 bottom-0 z-20 touch-none cursor-ns-resize bg-transparent transition-colors hover:bg-white/15 ${resizeHandleClass}`}
                      />
                    </div>
                  );
                  })}
                </div>
              </div>
            )}
          </div>

          {!compareMode ? (
            <aside className="order-1 space-y-4 xl:sticky xl:top-6 xl:order-none xl:max-h-[calc(100vh-3rem)] xl:space-y-5 xl:overflow-y-auto xl:pr-2 xl:[scrollbar-gutter:stable]">
            <RoutineAllocationList blocks={blocksForActiveRoutine} />

            <section className="border-y border-white/[0.10] py-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-zinc-300">
                  Preset blocks
                </p>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                  {presetItems.length}
                </span>
              </div>
              {presetItems.length > 0 ? (
                <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:block sm:space-y-2 sm:overflow-visible sm:pb-0">
                  {presetItems.map((item) => {
                    const completed = activeCompletedIds.includes(item.id);
                    const presetColor = getRotatingBlockColor(item.sortOrder);
                    const presetColorStyle = getBlockColorStyle(presetColor);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        draggable
                        onDragStart={(event) => handlePresetDragStart(event, item)}
                        onDragEnd={() => {
                          setDraggedPresetItemId(null);
                          setDropPreviewMinute(null);
                        }}
                        onClick={() => handleCreatePresetBlock(item)}
                        disabled={isPending}
                        className={`grid min-h-12 w-[13rem] shrink-0 snap-start cursor-grab grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition-all active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-45 sm:w-full sm:shrink ${
                          draggedPresetItemId === item.id
                            ? "border-amber-100/45 bg-amber-200/[0.10] text-white shadow-[0_0_28px_rgba(251,191,36,0.12)]"
                            : "border-white/[0.12] bg-white/[0.045] hover:border-cyan-200/35 hover:bg-cyan-200/[0.08] hover:text-white"
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-sm border font-mono text-[12px] text-white"
                          style={{
                            backgroundColor: presetColorStyle.bg,
                            borderColor: presetColorStyle.border,
                            boxShadow: presetColorStyle.shadow,
                          }}
                        >
                          +
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block truncate text-sm ${
                              completed
                                ? "text-zinc-500 line-through"
                                : "text-zinc-100"
                            }`}
                          >
                            {item.label}
                          </span>
                          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                            focus preset
                          </span>
                        </span>
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-sm border text-[10px] ${
                            completed
                              ? "border-cyan-100/55 bg-cyan-200/15 text-cyan-50"
                              : "border-white/[0.14] text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          <CheckGlyph />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-400">
                  Add focus items to use them as presets.
                </p>
              )}
            </section>

            <section className="border-y border-white/[0.08] py-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-zinc-300">
                  New block
                </p>
                <button
                  type="button"
                  onClick={handleUseNextOpenTime}
                  className="cursor-pointer text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-200/70 transition-colors hover:text-cyan-100"
                >
                  Next slot
                </button>
              </div>
              <input
                value={newBlockTitle}
                onChange={(event) => setNewBlockTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreateBlock();
                }}
                placeholder="Block title"
                className="mb-3 min-h-11 w-full rounded-sm border border-white/[0.12] bg-white/[0.05] px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 hover:border-white/18 focus:border-cyan-200/40"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-2 block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                    Start
                  </span>
                  <input
                    type="time"
                    value={newBlockStart}
                    onChange={(event) => setNewBlockStart(event.target.value)}
                    className="min-h-11 w-full cursor-pointer rounded-sm border border-white/[0.12] bg-zinc-900 px-2 py-2.5 font-mono text-[11px] text-zinc-100 outline-none transition-colors hover:border-white/18 focus:border-cyan-200/40"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                    End
                  </span>
                  <input
                    type="time"
                    value={newBlockEnd}
                    onChange={(event) => setNewBlockEnd(event.target.value)}
                    className="min-h-11 w-full cursor-pointer rounded-sm border border-white/[0.12] bg-zinc-900 px-2 py-2.5 font-mono text-[11px] text-zinc-100 outline-none transition-colors hover:border-white/18 focus:border-cyan-200/40"
                  />
                </label>
              </div>
              <div className="mt-3">
                <span className="mb-2 block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                  Color
                </span>
                <ColorPicker
                  value={newBlockColor}
                  onChange={setNewBlockColor}
                  disabled={isPending}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateBlock}
                disabled={isPending}
                className="mt-3 min-h-11 w-full cursor-pointer rounded-sm border border-cyan-200/24 bg-cyan-200/[0.075] px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-100 transition-colors hover:border-cyan-100/45 hover:bg-cyan-200/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create block
              </button>
            </section>

            {activeBlock ? (
              <section className="border-y border-white/[0.10] py-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-zinc-300">
                      Block
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {formatDuration(activeBlock.startMinute, activeBlock.endMinute)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(activeBlock)}
                    disabled={isPending}
                    className="cursor-pointer text-[9px] font-mono uppercase tracking-[0.2em] text-red-200/75 transition-colors hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Delete
                  </button>
                </div>

                <input
                  key={`${activeBlock.id}-title`}
                  defaultValue={activeBlock.title}
                  onBlur={(event) =>
                    handleSaveBlock(
                      activeBlock,
                      event.currentTarget.value,
                      activeBlock.startMinute,
                      activeBlock.endMinute,
                    )
                  }
                  className="mb-3 w-full rounded-sm border border-white/[0.13] bg-white/[0.05] px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors hover:border-white/22 focus:border-cyan-200/40"
                />
                <div className="mb-3 border-y border-white/[0.08] py-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                      Subtasks
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
                      {activeBlock.subtasks.length}
                    </span>
                  </div>
                  <div className="mb-3 flex gap-2">
                      <input
                        value={newSubtaskTitle}
                        onChange={(event) =>
                          setNewSubtaskDrafts((current) => ({
                            ...current,
                            [activeBlock.blockKey]: event.target.value,
                          }))
                        }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleAddSubtask(activeBlock);
                      }}
                      placeholder="Add subtask"
                      className="min-w-0 flex-1 rounded-sm border border-white/[0.13] bg-[#0d0f10] px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 hover:border-white/22 focus:border-cyan-200/40"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubtask(activeBlock)}
                      disabled={isPending || !newSubtaskTitle.trim()}
                      className="cursor-pointer rounded-sm border border-white/[0.16] px-3 py-2 text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-200 transition-colors hover:border-cyan-200/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Add
                    </button>
                  </div>
                  {activeBlock.subtasks.length > 0 ? (
                    <div className="space-y-2">
                      {activeBlock.subtasks.map((subtask, index) => {
                        const completed = completedSubtaskIds.includes(subtask.id);
                        const dragging = draggedSubtaskId === subtask.id;
                        const dropBefore =
                          subtaskDropPreview?.subtaskId === subtask.id &&
                          subtaskDropPreview.position === "before";
                        const dropAfter =
                          subtaskDropPreview?.subtaskId === subtask.id &&
                          subtaskDropPreview.position === "after";
                        const firstSubtask = index === 0;
                        const lastSubtask = index === activeBlock.subtasks.length - 1;
                        return (
                          <div
                            key={subtask.id}
                            draggable
                            onDragStart={(event) =>
                              handleSubtaskDragStart(event, subtask)
                            }
                            onDragOver={(event) =>
                              handleSubtaskDragOver(event, subtask)
                            }
                            onDragLeave={() => setSubtaskDropPreview(null)}
                            onDrop={(event) =>
                              handleSubtaskDrop(event, activeBlock, subtask)
                            }
                            onDragEnd={clearSubtaskDrag}
                            className={`group relative grid cursor-grab grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-sm border border-transparent px-1 py-1.5 transition-colors active:cursor-grabbing sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:py-1 ${
                              dragging
                                ? "border-cyan-100/30 bg-cyan-200/[0.055] opacity-65"
                                : "hover:border-white/[0.08] hover:bg-white/[0.025]"
                            }`}
                          >
                            {dropBefore ? (
                              <span className="absolute -top-1 left-1 right-1 border-t border-cyan-100/80" />
                            ) : null}
                            {dropAfter ? (
                              <span className="absolute -bottom-1 left-1 right-1 border-t border-cyan-100/80" />
                            ) : null}
                            <span
                              className="hidden h-7 w-5 items-center justify-center text-zinc-600 transition-colors group-hover:text-zinc-300 sm:flex"
                              aria-hidden="true"
                            >
                              <GripGlyph />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleSubtask(subtask)}
                              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border text-[11px] transition-colors ${
                                completed
                                  ? "border-cyan-100/55 bg-cyan-200/15 text-cyan-50"
                                  : "border-white/[0.16] text-transparent hover:border-white/28"
                              }`}
                              aria-label={
                                completed
                                  ? `Mark ${subtask.title} incomplete`
                                  : `Mark ${subtask.title} complete`
                              }
                            >
                              <CheckGlyph />
                            </button>
                            <SubtaskTitleField
                              key={`${subtask.id}-${subtask.title}`}
                              value={subtask.title}
                              completed={completed}
                              className="px-2 py-1.5 text-sm leading-5"
                              onSave={(value, field) =>
                                handleSaveSubtaskTitle(
                                  activeBlock,
                                  subtask,
                                  value,
                                  field,
                                )
                              }
                            />
                            <span className="flex items-center gap-1">
                              <span className="flex sm:hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveSubtask(activeBlock, subtask, -1)
                                  }
                                  disabled={firstSubtask || isPending}
                                  className="flex h-8 w-7 cursor-pointer items-center justify-center rounded-l-sm border border-white/[0.12] font-mono text-[10px] text-zinc-300 transition-colors hover:border-cyan-200/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                                  aria-label={`Move ${subtask.title} up`}
                                >
                                  ^
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleMoveSubtask(activeBlock, subtask, 1)
                                  }
                                  disabled={lastSubtask || isPending}
                                  className="flex h-8 w-7 cursor-pointer items-center justify-center rounded-r-sm border-y border-r border-white/[0.12] font-mono text-[10px] text-zinc-300 transition-colors hover:border-cyan-200/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                                  aria-label={`Move ${subtask.title} down`}
                                >
                                  v
                                </button>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteSubtask(activeBlock, subtask)
                                }
                                className="min-h-8 cursor-pointer px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:text-red-200"
                              >
                                Del
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-zinc-500">
                      Add subtasks, then check them off when this block is selected.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-2 block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                      Start
                    </span>
                    <input
                      key={`${activeBlock.id}-start-${activeBlock.startMinute}`}
                      type="time"
                      defaultValue={minuteToTimeValue(activeBlock.startMinute)}
                      onBlur={(event) => {
                        const minute = parseTimeValue(event.currentTarget.value);
                        if (minute === null) return;
                        handleSaveBlock(
                          activeBlock,
                          activeBlock.title,
                          minute,
                          activeBlock.endMinute,
                        );
                      }}
                      className="w-full cursor-pointer rounded-sm border border-white/[0.13] bg-zinc-900 px-2 py-2.5 font-mono text-[11px] text-zinc-100 outline-none transition-colors hover:border-white/22 focus:border-cyan-200/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                      End
                    </span>
                    <input
                      key={`${activeBlock.id}-end-${activeBlock.endMinute}`}
                      type="time"
                      defaultValue={minuteToTimeValue(activeBlock.endMinute)}
                      onBlur={(event) => {
                        const minute = parseTimeValue(event.currentTarget.value);
                        if (minute === null) return;
                        handleSaveBlock(
                          activeBlock,
                          activeBlock.title,
                          activeBlock.startMinute,
                          minute,
                        );
                      }}
                      className="w-full cursor-pointer rounded-sm border border-white/[0.13] bg-zinc-900 px-2 py-2.5 font-mono text-[11px] text-zinc-100 outline-none transition-colors hover:border-white/22 focus:border-cyan-200/40"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <span className="mb-2 block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                    Color
                  </span>
                  <ColorPicker
                    value={activeBlock.color}
                    onChange={(color) => handleChangeBlockColor(activeBlock, color)}
                    disabled={isPending}
                  />
                </div>
              </section>
            ) : null}

            <section className="border-y border-white/[0.10] py-5">
              <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.32em] text-zinc-300">
                Linked focus
              </p>
              {activeBlock && presetItems.length > 0 ? (
                <div className="space-y-2">
                  {presetItems.map((item) => {
                    const linked = activeBlock.checklistItemIds.includes(item.id);
                    const completed = activeCompletedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleLinkedItem(activeBlock, item.id)}
                          className={`h-5 w-5 cursor-pointer rounded-sm border text-[10px] transition-colors ${
                            linked
                              ? "border-cyan-100/55 bg-cyan-200/15 text-cyan-50"
                              : "border-white/[0.16] text-transparent hover:border-white/28"
                          }`}
                          aria-label={
                            linked
                              ? `Unlink ${item.label}`
                              : `Link ${item.label}`
                          }
                        >
                          +
                        </button>
                        <span
                          className={`min-w-0 truncate text-sm ${
                            completed ? "text-zinc-500 line-through" : "text-zinc-200"
                          }`}
                        >
                          {item.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleCompletion(item)}
                          className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border text-[11px] transition-colors ${
                            completed
                              ? "border-cyan-100/55 bg-cyan-200/15 text-cyan-50"
                              : "border-white/[0.16] text-zinc-400 hover:border-white/28 hover:text-zinc-100"
                          }`}
                          aria-label={
                            completed
                              ? `Mark ${item.label} incomplete`
                              : `Mark ${item.label} complete`
                          }
                        >
                          <CheckGlyph />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-400">
                  {activeBlock
                    ? "Add focus items, then link them here."
                    : "Select a block to link focus items."}
                </p>
              )}
            </section>

            {linkedItemsForActiveBlock.length > 0 ? (
              <section className="border-y border-white/[0.10] py-5">
                <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.32em] text-zinc-300">
                  Run this block
                </p>
                <div className="space-y-2">
                  {linkedItemsForActiveBlock.map((item) => {
                    const completed = activeCompletedIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onToggleCompletion(item)}
                        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.08] py-2 text-left transition-colors hover:bg-white/[0.035]"
                      >
                        <span
                          className={`min-w-0 text-sm ${
                            completed
                              ? "text-zinc-500 line-through"
                              : "text-zinc-100"
                          }`}
                        >
                          {item.label}
                        </span>
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-sm border text-[11px] ${
                            completed
                              ? "border-cyan-100/55 bg-cyan-200/15 text-cyan-50"
                              : "border-white/[0.16] text-zinc-400"
                          }`}
                        >
                          {completed ? <CheckGlyph /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            </aside>
          ) : null}
        </div>
      ) : (
        <div className="border-y border-white/[0.10] py-16 text-center">
          <p className="text-sm text-zinc-300">
            Create a routine to start mapping your day.
          </p>
        </div>
      )}

      {mobileSubtaskBlock ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/76 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-block-subtasks-title"
          onClick={() => setMobileSubtaskBlockId(null)}
        >
          <div
            className="max-h-[82vh] w-full overflow-y-auto rounded-md border border-white/[0.14] bg-[#080909] shadow-[0_-26px_80px_rgba(0,0,0,0.62)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-white/[0.10] bg-[#080909]/96 px-4 py-4 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.24em] text-cyan-100/70">
                    Subtasks
                  </p>
                  <h3
                    id="mobile-block-subtasks-title"
                    className="truncate text-xl font-semibold text-white"
                  >
                    {mobileSubtaskBlock.title}
                  </h3>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    {formatMinute(mobileSubtaskBlock.startMinute)} -{" "}
                    {formatMinute(mobileSubtaskBlock.endMinute)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSubtaskBlockId(null)}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/[0.16] bg-white/[0.045] font-mono text-lg text-zinc-200 transition-colors hover:border-cyan-200/35 hover:bg-white/[0.08] hover:text-white"
                  aria-label="Close subtasks"
                >
                  x
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-sm border border-white/[0.08] bg-white/[0.035] px-3 py-2">
                  <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-500">
                    Done
                  </p>
                  <p className="mt-1 font-mono text-sm text-zinc-100">
                    {mobileSubtaskCompletedCount} /{" "}
                    {mobileSubtaskBlock.subtasks.length}
                  </p>
                </div>
                <div className="rounded-sm border border-white/[0.08] bg-white/[0.035] px-3 py-2">
                  <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-500">
                    Length
                  </p>
                  <p className="mt-1 font-mono text-sm text-zinc-100">
                    {formatDuration(
                      mobileSubtaskBlock.startMinute,
                      mobileSubtaskBlock.endMinute,
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="mb-4 flex gap-2">
                <input
                  value={mobileSubtaskTitle}
                  onChange={(event) =>
                    setNewSubtaskDrafts((current) => ({
                      ...current,
                      [mobileSubtaskBlock.blockKey]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleAddSubtask(mobileSubtaskBlock);
                  }}
                  placeholder="Add subtask"
                  className="min-h-11 min-w-0 flex-1 rounded-sm border border-white/[0.13] bg-[#0d0f10] px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 hover:border-white/22 focus:border-cyan-200/40"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubtask(mobileSubtaskBlock)}
                  disabled={isPending || !mobileSubtaskTitle.trim()}
                  className="min-h-11 cursor-pointer rounded-sm border border-cyan-200/24 bg-cyan-200/[0.075] px-3 py-2 text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:border-cyan-100/45 hover:bg-cyan-200/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Add
                </button>
              </div>

              {mobileSubtaskBlock.subtasks.length > 0 ? (
                <div className="space-y-2">
                  {mobileSubtaskBlock.subtasks.map((subtask, index) => {
                    const completed = completedSubtaskIds.includes(subtask.id);
                    const firstSubtask = index === 0;
                    const lastSubtask =
                      index === mobileSubtaskBlock.subtasks.length - 1;
                    return (
                      <div
                        key={subtask.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-white/[0.08] bg-white/[0.025] px-2 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSubtask(subtask)}
                          className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border text-[12px] transition-colors ${
                            completed
                              ? "border-cyan-100/55 bg-cyan-200/15 text-cyan-50"
                              : "border-white/[0.16] text-transparent hover:border-white/28"
                          }`}
                          aria-label={
                            completed
                              ? `Mark ${subtask.title} incomplete`
                              : `Mark ${subtask.title} complete`
                          }
                        >
                          <CheckGlyph />
                        </button>
                        <SubtaskTitleField
                          key={`mobile-${subtask.id}-${subtask.title}`}
                          value={subtask.title}
                          completed={completed}
                          className="px-2 py-2 text-base leading-6"
                          onSave={(value, field) =>
                            handleSaveSubtaskTitle(
                              mobileSubtaskBlock,
                              subtask,
                              value,
                              field,
                            )
                          }
                        />
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveSubtask(mobileSubtaskBlock, subtask, -1)
                            }
                            disabled={firstSubtask || isPending}
                            className="flex h-9 w-8 cursor-pointer items-center justify-center rounded-l-sm border border-white/[0.12] font-mono text-[11px] text-zinc-300 transition-colors hover:border-cyan-200/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                            aria-label={`Move ${subtask.title} up`}
                          >
                            ^
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveSubtask(mobileSubtaskBlock, subtask, 1)
                            }
                            disabled={lastSubtask || isPending}
                            className="flex h-9 w-8 cursor-pointer items-center justify-center rounded-r-sm border-y border-r border-white/[0.12] font-mono text-[11px] text-zinc-300 transition-colors hover:border-cyan-200/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                            aria-label={`Move ${subtask.title} down`}
                          >
                            v
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSubtask(mobileSubtaskBlock, subtask)
                            }
                            className="min-h-9 cursor-pointer px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600 transition-colors hover:text-red-200"
                          >
                            Del
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-sm border border-white/[0.08] bg-white/[0.025] px-4 py-8 text-center">
                  <p className="text-sm text-zinc-500">No subtasks yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-xs font-mono text-red-400/80">{error}</p> : null}
      {notice ? <p className="mt-4 text-xs font-mono text-zinc-500">{notice}</p> : null}
    </section>
  );
}
