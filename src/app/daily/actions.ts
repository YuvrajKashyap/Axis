"use server";

import {
  isDailyWeekdayValue,
  isValidDailyDateKey,
  normalizeDailyLabel,
  type DailyChecklistItem,
  type DailyCompletion,
  type DailyCopyMode,
  type DailyWeekdayValue,
} from "@/lib/daily-alignment";
import { getSupabaseUser } from "@/lib/supabase-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type DailyItemRow = {
  id: string;
  weekday: number;
  label: string;
  sort_order: number;
};

type DailyCompletionRow = {
  item_id: string;
  date_key: string;
};

type ActionResult<T extends object = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

async function requireDailyUserId() {
  const user = await getSupabaseUser();
  return user?.id ?? null;
}

function mapDailyItem(row: DailyItemRow): DailyChecklistItem {
  return {
    id: row.id,
    weekday: row.weekday as DailyWeekdayValue,
    label: row.label,
    sortOrder: row.sort_order,
  };
}

export async function loadDailyCompletions(
  dateKeys: string[],
): Promise<DailyCompletion[]> {
  const userId = await requireDailyUserId();
  if (!userId) return [];

  const safeDateKeys = Array.from(
    new Set(dateKeys.filter(isValidDailyDateKey)),
  ).slice(0, 14);
  if (safeDateKeys.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_checklist_completions")
    .select("item_id,date_key")
    .eq("user_id", userId)
    .in("date_key", safeDateKeys);

  if (error || !data) {
    return [];
  }

  return (data as DailyCompletionRow[]).map((completion) => ({
    itemId: completion.item_id,
    dateKey: completion.date_key,
  }));
}

export async function createDailyItem(
  weekday: DailyWeekdayValue,
  label: string,
): Promise<ActionResult<{ item: DailyChecklistItem }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };
  if (!isDailyWeekdayValue(weekday)) {
    return { success: false, error: "Choose a valid day." };
  }

  const normalizedLabel = normalizeDailyLabel(label);
  if (!normalizedLabel) {
    return { success: false, error: "Item text is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: latest, error: latestError } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("weekday", weekday)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (latestError) {
    return { success: false, error: latestError.message };
  }

  const nextSortOrder =
    latest && latest.length > 0 ? Number(latest[0].sort_order ?? -1) + 1 : 0;

  const { data, error } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .insert({
      user_id: userId,
      weekday,
      label: normalizedLabel,
      sort_order: nextSortOrder,
    })
    .select("id,weekday,label,sort_order")
    .single<DailyItemRow>();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to add item." };
  }

  revalidatePath("/daily");
  return { success: true, item: mapDailyItem(data) };
}

export async function updateDailyItemLabel(
  itemId: string,
  label: string,
): Promise<ActionResult<{ item: DailyChecklistItem }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const normalizedLabel = normalizeDailyLabel(label);
  if (!normalizedLabel) {
    return { success: false, error: "Item text is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .update({
      label: normalizedLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", userId)
    .select("id,weekday,label,sort_order")
    .maybeSingle<DailyItemRow>();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Could not update that item.",
    };
  }

  revalidatePath("/daily");
  return { success: true, item: mapDailyItem(data) };
}

export async function deleteDailyItem(
  itemId: string,
): Promise<ActionResult<{ itemId: string }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/daily");
  return { success: true, itemId };
}

export async function reorderDailyItems(
  weekday: DailyWeekdayValue,
  orderedIds: string[],
): Promise<ActionResult> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };
  if (!isDailyWeekdayValue(weekday)) {
    return { success: false, error: "Choose a valid day." };
  }

  const uniqueIds = Array.from(new Set(orderedIds.filter(Boolean)));
  if (uniqueIds.length === 0) return { success: true };

  const supabase = await createSupabaseServerClient();
  const { data: ownedRows, error: ownedError } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("weekday", weekday)
    .in("id", uniqueIds);

  if (ownedError) {
    return { success: false, error: ownedError.message };
  }

  if ((ownedRows ?? []).length !== uniqueIds.length) {
    return { success: false, error: "Could not reorder those items." };
  }

  for (const [index, id] of uniqueIds.entries()) {
    const { error } = await supabase
      .schema("axis")
      .from("daily_checklist_items")
      .update({
        sort_order: index,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/daily");
  return { success: true };
}

export async function setDailyCompletion(
  itemId: string,
  dateKey: string,
  completed: boolean,
): Promise<ActionResult<{ itemId: string; dateKey: string; completed: boolean }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };
  if (!isValidDailyDateKey(dateKey)) {
    return { success: false, error: "Choose a valid date." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: item, error: itemError } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .select("id")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (itemError) {
    return { success: false, error: itemError.message };
  }

  if (!item) {
    return { success: false, error: "Item not found." };
  }

  if (completed) {
    const { error } = await supabase
      .schema("axis")
      .from("daily_checklist_completions")
      .upsert(
        {
          user_id: userId,
          item_id: itemId,
          date_key: dateKey,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,item_id,date_key" },
      );

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .schema("axis")
      .from("daily_checklist_completions")
      .delete()
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .eq("date_key", dateKey);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/daily");
  return { success: true, itemId, dateKey, completed };
}

export async function saveDailySettings(
  moveCheckedToBottom: boolean,
): Promise<ActionResult<{ moveCheckedToBottom: boolean }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("axis")
    .from("daily_checklist_settings")
    .upsert(
      {
        user_id: userId,
        move_checked_to_bottom: moveCheckedToBottom,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/daily");
  return { success: true, moveCheckedToBottom };
}

export async function copyDailyItems(
  sourceWeekday: DailyWeekdayValue,
  targetWeekday: DailyWeekdayValue,
  mode: DailyCopyMode,
): Promise<ActionResult<{ items: DailyChecklistItem[]; mode: DailyCopyMode }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };
  if (!isDailyWeekdayValue(sourceWeekday) || !isDailyWeekdayValue(targetWeekday)) {
    return { success: false, error: "Choose valid days." };
  }
  if (sourceWeekday === targetWeekday) {
    return { success: false, error: "Choose a different day to copy from." };
  }
  if (mode !== "replace" && mode !== "add") {
    return { success: false, error: "Choose replace or add." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: sourceItems, error: sourceError } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .select("label,sort_order")
    .eq("user_id", userId)
    .eq("weekday", sourceWeekday)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (sourceError) {
    return { success: false, error: sourceError.message };
  }

  const labels = (sourceItems ?? [])
    .map((item) => normalizeDailyLabel(item.label ?? ""))
    .filter(Boolean);

  if (labels.length === 0) {
    return { success: false, error: "That day has no items to copy." };
  }

  if (mode === "replace") {
    const { error: deleteError } = await supabase
      .schema("axis")
      .from("daily_checklist_items")
      .delete()
      .eq("user_id", userId)
      .eq("weekday", targetWeekday);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }
  }

  let startSortOrder = 0;
  if (mode === "add") {
    const { data: latest, error: latestError } = await supabase
      .schema("axis")
      .from("daily_checklist_items")
      .select("sort_order")
      .eq("user_id", userId)
      .eq("weekday", targetWeekday)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (latestError) {
      return { success: false, error: latestError.message };
    }

    startSortOrder =
      latest && latest.length > 0 ? Number(latest[0].sort_order ?? -1) + 1 : 0;
  }

  const { data: inserted, error: insertError } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .insert(
      labels.map((label, index) => ({
        user_id: userId,
        weekday: targetWeekday,
        label,
        sort_order: startSortOrder + index,
      })),
    )
    .select("id,weekday,label,sort_order");

  if (insertError || !inserted) {
    return {
      success: false,
      error: insertError?.message ?? "Failed to copy checklist.",
    };
  }

  revalidatePath("/daily");
  return {
    success: true,
    items: (inserted as DailyItemRow[]).map(mapDailyItem),
    mode,
  };
}
