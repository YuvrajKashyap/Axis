export const DAILY_WEEKDAYS = [
  { value: 1, label: "Monday", shortLabel: "Mon" },
  { value: 2, label: "Tuesday", shortLabel: "Tue" },
  { value: 3, label: "Wednesday", shortLabel: "Wed" },
  { value: 4, label: "Thursday", shortLabel: "Thu" },
  { value: 5, label: "Friday", shortLabel: "Fri" },
  { value: 6, label: "Saturday", shortLabel: "Sat" },
  { value: 7, label: "Sunday", shortLabel: "Sun" },
] as const;

export const FOCUS_LIST_WEEKDAY = 1;
export const DEFAULT_DAILY_ROUTINE_BLOCK_COLOR = "#7c3aed";
export const DAILY_ROUTINE_BLOCK_COLORS = [
  "#7c3aed",
  "#06b6d4",
  "#d946ef",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
] as const;

export type DailyWeekdayValue = (typeof DAILY_WEEKDAYS)[number]["value"];
export type DailyCopyMode = "replace" | "add";
export type DailyRoutineBlockColor = string;

export type DailyChecklistItem = {
  id: string;
  weekday: DailyWeekdayValue;
  label: string;
  sortOrder: number;
};

export type DailyCompletion = {
  itemId: string;
  dateKey: string;
};

export type DailySettings = {
  moveCheckedToBottom: boolean;
};

export type DailyRoutine = {
  id: string;
  name: string;
  sortOrder: number;
};

export type DailyRoutineBlockSubtask = {
  id: string;
  blockId: string | null;
  blockKey: string;
  title: string;
  sortOrder: number;
};

export type DailyRoutineBlock = {
  id: string;
  routineId: string;
  title: string;
  blockKey: string;
  color: DailyRoutineBlockColor;
  startMinute: number;
  endMinute: number;
  sortOrder: number;
  checklistItemIds: string[];
  subtasks: DailyRoutineBlockSubtask[];
};

export type DailyRoutineSelection = {
  dateKey: string;
  routineId: string | null;
};

export function isDailyWeekdayValue(
  value: number,
): value is DailyWeekdayValue {
  return DAILY_WEEKDAYS.some((weekday) => weekday.value === value);
}

export function normalizeDailyLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").slice(0, 140);
}

export function normalizeDailyRoutineName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function normalizeDailyRoutineBlockTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function getDailyRoutineBlockKey(title: string) {
  return normalizeDailyRoutineBlockTitle(title).toLowerCase();
}

export function normalizeDailyRoutineBlockSubtaskTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").slice(0, 140);
}

export function normalizeDailyRoutineBlockColor(
  color: string | null | undefined,
): DailyRoutineBlockColor {
  const normalized = color?.trim().toLowerCase();
  if (!normalized) return DEFAULT_DAILY_ROUTINE_BLOCK_COLOR;
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;

  const legacyColors: Record<string, string> = {
    violet: "#7c3aed",
    cyan: "#06b6d4",
    fuchsia: "#d946ef",
    blue: "#3b82f6",
    emerald: "#10b981",
    amber: "#f59e0b",
    rose: "#f43f5e",
  };

  return legacyColors[normalized] ?? DEFAULT_DAILY_ROUTINE_BLOCK_COLOR;
}

export function isValidDailyDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function clampDailyMinute(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1440, Math.max(0, Math.round(value)));
}

export function isValidDailyMinute(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 1440;
}
