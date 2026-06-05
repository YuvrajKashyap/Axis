export const DAILY_WEEKDAYS = [
  { value: 1, label: "Monday", shortLabel: "Mon" },
  { value: 2, label: "Tuesday", shortLabel: "Tue" },
  { value: 3, label: "Wednesday", shortLabel: "Wed" },
  { value: 4, label: "Thursday", shortLabel: "Thu" },
  { value: 5, label: "Friday", shortLabel: "Fri" },
  { value: 6, label: "Saturday", shortLabel: "Sat" },
  { value: 7, label: "Sunday", shortLabel: "Sun" },
] as const;

export type DailyWeekdayValue = (typeof DAILY_WEEKDAYS)[number]["value"];
export type DailyCopyMode = "replace" | "add";

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

export function isDailyWeekdayValue(
  value: number,
): value is DailyWeekdayValue {
  return DAILY_WEEKDAYS.some((weekday) => weekday.value === value);
}

export function normalizeDailyLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").slice(0, 140);
}

export function isValidDailyDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
