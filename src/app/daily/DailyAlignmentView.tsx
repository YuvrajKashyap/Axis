"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  DAILY_WEEKDAYS,
  type DailyChecklistItem,
  type DailyCompletion,
  type DailyCopyMode,
  type DailySettings,
  type DailyWeekdayValue,
} from "@/lib/daily-alignment";
import {
  copyDailyItems,
  createDailyItem,
  deleteDailyItem,
  loadDailyCompletions,
  reorderDailyItems,
  saveDailySettings,
  setDailyCompletion,
  updateDailyItemLabel,
} from "./actions";

type WeekCalendar = {
  todayWeekday: DailyWeekdayValue;
  todayDateKey: string;
  datesByWeekday: Record<number, string>;
  labelsByWeekday: Record<number, string>;
};

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getIsoWeekday(date: Date): DailyWeekdayValue {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as DailyWeekdayValue;
}

function buildWeekCalendar(): WeekCalendar {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWeekday = getIsoWeekday(today);
  const monday = new Date(today);
  monday.setDate(today.getDate() - (todayWeekday - 1));

  const datesByWeekday: Record<number, string> = {};
  const labelsByWeekday: Record<number, string> = {};
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });

  DAILY_WEEKDAYS.forEach((weekday, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    datesByWeekday[weekday.value] = getLocalDateKey(date);
    labelsByWeekday[weekday.value] = dateFormatter.format(date);
  });

  return {
    todayWeekday,
    todayDateKey: getLocalDateKey(today),
    datesByWeekday,
    labelsByWeekday,
  };
}

let cachedWeekCalendar: WeekCalendar | null = null;

function getFreshWeekCalendar() {
  const nextCalendar = buildWeekCalendar();
  if (
    !cachedWeekCalendar ||
    cachedWeekCalendar.todayDateKey !== nextCalendar.todayDateKey
  ) {
    cachedWeekCalendar = nextCalendar;
  }
  return cachedWeekCalendar;
}

function subscribeToWeekCalendar(onStoreChange: () => void) {
  const intervalId = window.setInterval(() => {
    const previousDateKey = cachedWeekCalendar?.todayDateKey;
    const nextCalendar = buildWeekCalendar();
    if (previousDateKey !== nextCalendar.todayDateKey) {
      cachedWeekCalendar = nextCalendar;
      onStoreChange();
    }
  }, 60_000);

  return () => window.clearInterval(intervalId);
}

function getServerWeekCalendarSnapshot() {
  return null;
}

function getDefaultCopySourceWeekday(
  weekday: DailyWeekdayValue,
): DailyWeekdayValue {
  return weekday === 1 ? 2 : ((weekday - 1) as DailyWeekdayValue);
}

function sortItems(items: DailyChecklistItem[]) {
  return [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
}

function completionMapFromRows(rows: DailyCompletion[]) {
  return rows.reduce<Record<string, string[]>>((map, completion) => {
    map[completion.dateKey] = map[completion.dateKey] ?? [];
    if (!map[completion.dateKey].includes(completion.itemId)) {
      map[completion.dateKey].push(completion.itemId);
    }
    return map;
  }, {});
}

function CheckIcon() {
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

export function DailyAlignmentView({
  items: initialItems,
  settings: initialSettings,
}: {
  items: DailyChecklistItem[];
  settings: DailySettings;
}) {
  const [items, setItems] = useState(() => sortItems(initialItems));
  const [moveCheckedToBottom, setMoveCheckedToBottom] = useState(
    initialSettings.moveCheckedToBottom,
  );
  const calendar = useSyncExternalStore(
    subscribeToWeekCalendar,
    getFreshWeekCalendar,
    getServerWeekCalendarSnapshot,
  );
  const [activeWeekdayOverride, setActiveWeekdayOverride] =
    useState<DailyWeekdayValue | null>(null);
  const [completedByDate, setCompletedByDate] = useState<Record<string, string[]>>(
    {},
  );
  const [newItemText, setNewItemText] = useState("");
  const [copySourceWeekdayOverride, setCopySourceWeekdayOverride] =
    useState<DailyWeekdayValue | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!calendar) return;

    let cancelled = false;
    loadDailyCompletions(Object.values(calendar.datesByWeekday)).then(
      (completions) => {
        if (!cancelled) {
          setCompletedByDate(completionMapFromRows(completions));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [calendar]);

  const activeWeekday =
    activeWeekdayOverride ?? calendar?.todayWeekday ?? DAILY_WEEKDAYS[0].value;
  const copySourceWeekday =
    copySourceWeekdayOverride ?? getDefaultCopySourceWeekday(activeWeekday);
  const activeDateKey = calendar?.datesByWeekday[activeWeekday] ?? "";
  const activeDateLabel = calendar?.labelsByWeekday[activeWeekday] ?? "";
  const activeDay = DAILY_WEEKDAYS.find((day) => day.value === activeWeekday)!;
  const activeCompletedIds = useMemo(
    () => completedByDate[activeDateKey] ?? [],
    [activeDateKey, completedByDate],
  );

  const itemsForActiveDay = useMemo(() => {
    const dayItems = sortItems(
      items.filter((item) => item.weekday === activeWeekday),
    );

    if (!moveCheckedToBottom) return dayItems;

    return dayItems.sort((a, b) => {
      const aDone = activeCompletedIds.includes(a.id);
      const bDone = activeCompletedIds.includes(b.id);
      if (aDone === bDone) return a.sortOrder - b.sortOrder;
      return aDone ? 1 : -1;
    });
  }, [activeCompletedIds, activeWeekday, items, moveCheckedToBottom]);

  const rawItemsForActiveDay = useMemo(
    () => sortItems(items.filter((item) => item.weekday === activeWeekday)),
    [activeWeekday, items],
  );

  const completedCount = rawItemsForActiveDay.filter((item) =>
    activeCompletedIds.includes(item.id),
  ).length;

  function clearMessages() {
    setError("");
    setNotice("");
  }

  function setCompletionsForDate(dateKey: string, itemIds: string[]) {
    setCompletedByDate((current) => ({
      ...current,
      [dateKey]: itemIds,
    }));
  }

  function replaceItemsForWeekday(
    weekday: DailyWeekdayValue,
    nextItems: DailyChecklistItem[],
  ) {
    setItems((current) =>
      sortItems([
        ...current.filter((item) => item.weekday !== weekday),
        ...nextItems,
      ]),
    );
  }

  function patchItem(nextItem: DailyChecklistItem) {
    setItems((current) =>
      sortItems(
        current.map((item) => (item.id === nextItem.id ? nextItem : item)),
      ),
    );
  }

  function handleAddItem() {
    const label = newItemText.trim();
    if (!label) return;
    clearMessages();
    startTransition(async () => {
      const result = await createDailyItem(activeWeekday, label);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setItems((current) => sortItems([...current, result.item]));
      setNewItemText("");
    });
  }

  function handleSaveLabel(
    item: DailyChecklistItem,
    label: string,
    input: HTMLInputElement,
  ) {
    const trimmed = label.trim();
    if (!trimmed) {
      input.value = item.label;
      setError("Item text is required.");
      setNotice("");
      return;
    }
    if (trimmed === item.label) {
      input.value = item.label;
      return;
    }
    clearMessages();
    startTransition(async () => {
      const result = await updateDailyItemLabel(item.id, trimmed);
      if (!result.success) {
        setError(result.error);
        input.value = item.label;
        return;
      }

      input.value = result.item.label;
      patchItem(result.item);
    });
  }

  function handleDeleteItem(item: DailyChecklistItem) {
    clearMessages();
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    startTransition(async () => {
      const result = await deleteDailyItem(item.id);
      if (!result.success) {
        setError(result.error);
        setItems((current) => sortItems([...current, item]));
      }
    });
  }

  function handleMoveItem(item: DailyChecklistItem, direction: -1 | 1) {
    const dayItems = rawItemsForActiveDay;
    const currentIndex = dayItems.findIndex((dayItem) => dayItem.id === item.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= dayItems.length) {
      return;
    }

    const reordered = [...dayItems];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    const nextItems = reordered.map((dayItem, index) => ({
      ...dayItem,
      sortOrder: index,
    }));

    replaceItemsForWeekday(activeWeekday, nextItems);
    clearMessages();
    startTransition(async () => {
      const result = await reorderDailyItems(
        activeWeekday,
        nextItems.map((dayItem) => dayItem.id),
      );
      if (!result.success) {
        setError(result.error);
        replaceItemsForWeekday(activeWeekday, dayItems);
      }
    });
  }

  function handleToggleCompletion(item: DailyChecklistItem) {
    if (!activeDateKey) return;

    const currentlyCompleted = activeCompletedIds.includes(item.id);
    const nextCompletedIds = currentlyCompleted
      ? activeCompletedIds.filter((id) => id !== item.id)
      : [...activeCompletedIds, item.id];

    setCompletionsForDate(activeDateKey, nextCompletedIds);
    clearMessages();
    startTransition(async () => {
      const result = await setDailyCompletion(
        item.id,
        activeDateKey,
        !currentlyCompleted,
      );
      if (!result.success) {
        setError(result.error);
        setCompletionsForDate(activeDateKey, activeCompletedIds);
      }
    });
  }

  function handleToggleMoveChecked() {
    const nextValue = !moveCheckedToBottom;
    setMoveCheckedToBottom(nextValue);
    clearMessages();
    startTransition(async () => {
      const result = await saveDailySettings(nextValue);
      if (!result.success) {
        setError(result.error);
        setMoveCheckedToBottom(!nextValue);
      }
    });
  }

  function handleCopy(mode: DailyCopyMode) {
    if (copySourceWeekday === activeWeekday) return;
    clearMessages();
    startTransition(async () => {
      const result = await copyDailyItems(
        copySourceWeekday,
        activeWeekday,
        mode,
      );
      if (!result.success) {
        setError(result.error);
        return;
      }

      if (mode === "replace") {
        replaceItemsForWeekday(activeWeekday, result.items);
        if (activeDateKey) {
          setCompletionsForDate(activeDateKey, []);
        }
      } else {
        setItems((current) => sortItems([...current, ...result.items]));
      }

      const source = DAILY_WEEKDAYS.find(
        (day) => day.value === copySourceWeekday,
      )?.label;
      setNotice(
        mode === "replace"
          ? `Replaced ${activeDay.label} with ${source}.`
          : `Added ${source} to ${activeDay.label}.`,
      );
    });
  }

  return (
    <main className="min-h-screen bg-black pb-16 text-white">
      <header className="border-b border-white/[0.04] bg-black/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 md:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="cursor-pointer text-[9px] font-mono uppercase tracking-[0.32em] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Axis
            </Link>
            <div className="h-4 w-px bg-white/[0.06]" />
            <p className="text-[9px] font-mono uppercase tracking-[0.38em] text-zinc-600">
              Daily Alignment
            </p>
          </div>
          <p className="hidden text-right text-[9px] font-mono uppercase tracking-[0.28em] text-zinc-700 sm:block">
            {calendar ? calendar.todayDateKey : "loading"}
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 pt-8 sm:px-8 md:grid-cols-[minmax(0,1fr)_18rem] md:px-10 md:pt-12">
        <section className="min-w-0">
          <div className="mb-8">
            <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.42em] text-zinc-600">
              {activeDateKey === calendar?.todayDateKey ? "Today" : activeDay.label}
            </p>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1
                  className="text-4xl font-light tracking-tight text-zinc-100 sm:text-5xl"
                  style={{
                    fontFamily: "var(--font-playfair), Georgia, serif",
                  }}
                >
                  Daily Alignment
                </h1>
                <p className="mt-3 text-sm leading-7 text-zinc-500">
                  {calendar
                    ? `${activeDay.label} - ${activeDateLabel}`
                    : "Loading local week"}
                </p>
              </div>
              {rawItemsForActiveDay.length > 0 ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-zinc-600">
                  {completedCount} / {rawItemsForActiveDay.length}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mb-6 overflow-x-auto border-y border-white/[0.04] py-3">
            <div className="flex min-w-max gap-2">
              {DAILY_WEEKDAYS.map((weekday) => {
                const active = activeWeekday === weekday.value;
                const isToday = calendar?.todayWeekday === weekday.value;
                const dateLabel = calendar?.labelsByWeekday[weekday.value] ?? "";
                return (
                  <button
                    key={weekday.value}
                    type="button"
                    onClick={() => {
                      setActiveWeekdayOverride(weekday.value);
                      clearMessages();
                    }}
                    className="min-w-[5.2rem] cursor-pointer rounded-md border px-3 py-2 text-left transition-colors hover:border-white/15 hover:bg-white/[0.03]"
                    style={{
                      borderColor: active
                        ? "rgba(255,255,255,0.16)"
                        : "rgba(255,255,255,0.05)",
                      backgroundColor: active
                        ? "rgba(255,255,255,0.055)"
                        : "rgba(255,255,255,0.012)",
                    }}
                  >
                    <span className="block text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-300">
                      {weekday.shortLabel}
                    </span>
                    <span className="mt-1 block text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">
                      {isToday ? "Today" : dateLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {itemsForActiveDay.length > 0 ? (
              itemsForActiveDay.map((item) => {
                const completed = activeCompletedIds.includes(item.id);
                const realIndex = rawItemsForActiveDay.findIndex(
                  (dayItem) => dayItem.id === item.id,
                );
                return (
                  <div
                    key={item.id}
                    className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.035] py-3"
                  >
                    <div className="flex w-12 shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${item.label} up`}
                        disabled={isPending || realIndex <= 0}
                        onClick={() => handleMoveItem(item, -1)}
                        className="h-6 w-5 cursor-pointer text-[11px] font-mono text-zinc-700 transition-colors hover:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        ^
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${item.label} down`}
                        disabled={
                          isPending || realIndex >= rawItemsForActiveDay.length - 1
                        }
                        onClick={() => handleMoveItem(item, 1)}
                        className="h-6 w-5 cursor-pointer text-[11px] font-mono text-zinc-700 transition-colors hover:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        v
                      </button>
                    </div>

                    <input
                      defaultValue={item.label}
                      onBlur={(event) =>
                        handleSaveLabel(
                          item,
                          event.currentTarget.value,
                          event.currentTarget,
                        )
                      }
                      className={`min-w-0 bg-transparent py-2 text-sm leading-6 tracking-wide outline-none transition-colors ${
                        completed
                          ? "text-zinc-600 line-through decoration-white/10"
                          : "text-zinc-200"
                      }`}
                    />

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        disabled={isPending}
                        className="cursor-pointer text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-700 opacity-0 transition-all hover:text-red-400/70 disabled:cursor-not-allowed disabled:opacity-20 group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        aria-label={
                          completed
                            ? `Mark ${item.label} incomplete`
                            : `Mark ${item.label} complete`
                        }
                        aria-pressed={completed}
                        disabled={isPending || !activeDateKey}
                        onClick={() => handleToggleCompletion(item)}
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-sm border transition-all disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          borderColor: completed
                            ? "rgba(103,232,249,0.42)"
                            : "rgba(255,255,255,0.09)",
                          color: completed
                            ? "rgba(103,232,249,0.9)"
                            : "rgba(113,113,122,0.8)",
                          backgroundColor: completed
                            ? "rgba(103,232,249,0.08)"
                            : "rgba(255,255,255,0.012)",
                          boxShadow: completed
                            ? "0 0 18px rgba(103,232,249,0.10)"
                            : "none",
                        }}
                      >
                        {completed ? <CheckIcon /> : null}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="border-y border-white/[0.04] py-12 text-center">
                <p className="text-sm text-zinc-500">
                  No items for {activeDay.label}.
                </p>
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <input
              value={newItemText}
              onChange={(event) => setNewItemText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAddItem();
                }
              }}
              placeholder={`Add to ${activeDay.label}`}
              className="min-w-0 flex-1 rounded-md border border-white/[0.06] bg-white/[0.018] px-4 py-3 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-white/15"
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={isPending || !newItemText.trim()}
              className="cursor-pointer rounded-md border border-white/[0.08] px-5 py-3 text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-400 transition-colors hover:border-white/16 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Add
            </button>
          </div>

          {error ? (
            <p className="mt-4 text-xs font-mono text-red-400/80">{error}</p>
          ) : null}
          {notice ? (
            <p className="mt-4 text-xs font-mono text-zinc-500">{notice}</p>
          ) : null}
        </section>

        <aside className="space-y-6 md:pt-[9.2rem]">
          <section className="border-y border-white/[0.04] py-5">
            <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.36em] text-zinc-600">
              Settings
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={moveCheckedToBottom}
              onClick={handleToggleMoveChecked}
              disabled={isPending}
              className="group -mx-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center justify-between gap-4 rounded-sm px-1 py-2 text-left transition-colors hover:bg-white/[0.018] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-mono uppercase leading-5 tracking-[0.22em] text-zinc-400 transition-colors group-hover:text-zinc-200">
                  Move checked to bottom
                </span>
                <span className="mt-0.5 block text-[10px] font-mono uppercase leading-4 tracking-[0.14em] text-zinc-700">
                  {moveCheckedToBottom ? "On" : "Off"}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`relative h-[18px] w-9 shrink-0 rounded-full border transition-colors ${
                  moveCheckedToBottom
                    ? "border-cyan-300/35 bg-cyan-300/15"
                    : "border-white/10 bg-white/[0.025]"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${
                    moveCheckedToBottom
                      ? "translate-x-[18px] bg-cyan-100 shadow-[0_0_14px_rgba(103,232,249,0.18)]"
                      : "translate-x-0 bg-zinc-500 group-hover:bg-zinc-300"
                  }`}
                />
              </span>
            </button>
          </section>

          <section className="border-y border-white/[0.04] py-5">
            <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.36em] text-zinc-600">
              Copy
            </p>
            <label className="mb-2 block text-[9px] font-mono uppercase tracking-[0.24em] text-zinc-700">
              From
            </label>
            <select
              value={copySourceWeekday}
              onChange={(event) =>
                setCopySourceWeekdayOverride(
                  Number(event.target.value) as DailyWeekdayValue,
                )
              }
              className="w-full cursor-pointer rounded-md border border-white/[0.06] bg-zinc-950 px-3 py-2 text-[11px] font-mono text-zinc-300 outline-none transition-colors hover:border-white/12 focus:border-white/12"
            >
              {DAILY_WEEKDAYS.map((weekday) => (
                <option key={weekday.value} value={weekday.value}>
                  {weekday.label}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCopy("add")}
                disabled={isPending || copySourceWeekday === activeWeekday}
                className="cursor-pointer rounded-md border border-white/[0.06] px-3 py-2 text-[9px] font-mono uppercase tracking-[0.24em] text-zinc-500 transition-colors hover:border-white/12 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => handleCopy("replace")}
                disabled={isPending || copySourceWeekday === activeWeekday}
                className="cursor-pointer rounded-md border border-white/[0.06] px-3 py-2 text-[9px] font-mono uppercase tracking-[0.24em] text-zinc-500 transition-colors hover:border-white/12 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Replace
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
