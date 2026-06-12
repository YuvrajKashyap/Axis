"use server";

import {
  FOCUS_LIST_WEEKDAY,
  getDailyRoutineBlockKey,
  isDailyWeekdayValue,
  isValidDailyDateKey,
  normalizeDailyLabel,
  normalizeDailyRoutineBlockColor,
  normalizeDailyRoutineBlockSubtaskTitle,
  normalizeDailyRoutineBlockTitle,
  normalizeDailyRoutineName,
  isValidDailyMinute,
  type DailyChecklistItem,
  type DailyCompletion,
  type DailyCopyMode,
  type DailyRoutine,
  type DailyRoutineBlock,
  type DailyRoutineBlockColor,
  type DailyRoutineSelection,
  type DailyRoutineBlockSubtask,
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

type DailyRoutineRow = {
  id: string;
  name: string;
  sort_order: number;
};

type DailyRoutineBlockRow = {
  id: string;
  routine_id: string;
  title: string;
  color: string | null;
  start_minute: number;
  end_minute: number;
  sort_order: number;
};

type DailyRoutineBlockItemRow = {
  block_id: string;
  item_id: string;
  sort_order: number;
};

type DailyRoutineBlockSubtaskRow = {
  id: string;
  block_id: string | null;
  block_key: string;
  title: string;
  sort_order: number;
};

type DailyRoutineBlockSubtaskCompletionRow = {
  subtask_id: string;
};

type ActionResult<T extends object = object> =
  | ({ success: true } & T)
  | { success: false; error: string };

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

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

function mapDailyRoutine(row: DailyRoutineRow): DailyRoutine {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

function mapDailyRoutineBlock(
  row: DailyRoutineBlockRow,
  links: DailyRoutineBlockItemRow[] = [],
  subtasks: DailyRoutineBlockSubtaskRow[] = [],
): DailyRoutineBlock {
  const blockKey = getDailyRoutineBlockKey(row.title);
  return {
    id: row.id,
    routineId: row.routine_id,
    title: row.title,
    blockKey,
    color: normalizeDailyRoutineBlockColor(row.color),
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    sortOrder: row.sort_order,
    checklistItemIds: links
      .filter((link) => link.block_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => link.item_id),
    subtasks: subtasks
      .filter((subtask) => subtask.block_key === blockKey)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(mapDailyRoutineBlockSubtask),
  };
}

function mapDailyRoutineBlockSubtask(
  row: DailyRoutineBlockSubtaskRow,
): DailyRoutineBlockSubtask {
  return {
    id: row.id,
    blockId: row.block_id,
    blockKey: row.block_key,
    title: row.title,
    sortOrder: row.sort_order,
  };
}

function isValidRoutineRange(startMinute: number, endMinute: number) {
  return (
    isValidDailyMinute(startMinute) &&
    isValidDailyMinute(endMinute) &&
    startMinute < endMinute
  );
}

function getCopiedRoutineName(name: string) {
  const suffix = " copy";
  const sourceName = normalizeDailyRoutineName(name) || "Routine";
  return normalizeDailyRoutineName(
    `${sourceName.slice(0, 80 - suffix.length)}${suffix}`,
  );
}

async function loadDailyRoutineBlockSubtasksForKey(
  supabase: SupabaseServerClient,
  userId: string,
  blockKey: string,
) {
  const { data } = await supabase
    .schema("axis")
    .from("daily_routine_block_subtasks")
    .select("id,block_id,block_key,title,sort_order")
    .eq("user_id", userId)
    .eq("block_key", blockKey)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as DailyRoutineBlockSubtaskRow[];
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
  label: string,
): Promise<ActionResult<{ item: DailyChecklistItem }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

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
    .eq("weekday", FOCUS_LIST_WEEKDAY)
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
      weekday: FOCUS_LIST_WEEKDAY,
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
  orderedIds: string[],
): Promise<ActionResult> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const uniqueIds = Array.from(new Set(orderedIds.filter(Boolean)));
  if (uniqueIds.length === 0) return { success: true };

  const supabase = await createSupabaseServerClient();
  const { data: ownedRows, error: ownedError } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("weekday", FOCUS_LIST_WEEKDAY)
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

export async function loadDailyRoutineSelection(
  dateKey: string,
): Promise<DailyRoutineSelection | null> {
  const userId = await requireDailyUserId();
  if (!userId || !isValidDailyDateKey(dateKey)) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_routine_day_selections")
    .select("date_key,routine_id")
    .eq("user_id", userId)
    .eq("date_key", dateKey)
    .maybeSingle<{ date_key: string; routine_id: string | null }>();

  if (error || !data) return null;
  return {
    dateKey: data.date_key,
    routineId: data.routine_id,
  };
}

export async function selectDailyRoutine(
  dateKey: string,
  routineId: string | null,
): Promise<ActionResult<{ selection: DailyRoutineSelection }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };
  if (!isValidDailyDateKey(dateKey)) {
    return { success: false, error: "Choose a valid date." };
  }

  const supabase = await createSupabaseServerClient();
  if (routineId) {
    const { data: routine, error: routineError } = await supabase
      .schema("axis")
      .from("daily_routines")
      .select("id")
      .eq("id", routineId)
      .eq("user_id", userId)
      .maybeSingle();

    if (routineError) {
      return { success: false, error: routineError.message };
    }
    if (!routine) {
      return { success: false, error: "Routine not found." };
    }
  }

  const { error } = await supabase
    .schema("axis")
    .from("daily_routine_day_selections")
    .upsert(
      {
        user_id: userId,
        date_key: dateKey,
        routine_id: routineId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date_key" },
    );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/daily");
  return {
    success: true,
    selection: {
      dateKey,
      routineId,
    },
  };
}

export async function createDailyRoutine(
  name: string,
): Promise<ActionResult<{ routine: DailyRoutine; blocks: DailyRoutineBlock[] }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const normalizedName = normalizeDailyRoutineName(name);
  if (!normalizedName) {
    return { success: false, error: "Routine name is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: latest, error: latestError } = await supabase
    .schema("axis")
    .from("daily_routines")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (latestError) {
    return { success: false, error: latestError.message };
  }

  const nextSortOrder =
    latest && latest.length > 0 ? Number(latest[0].sort_order ?? -1) + 1 : 0;

  const { data: routineRow, error: routineError } = await supabase
    .schema("axis")
    .from("daily_routines")
    .insert({
      user_id: userId,
      name: normalizedName,
      sort_order: nextSortOrder,
    })
    .select("id,name,sort_order")
    .single<DailyRoutineRow>();

  if (routineError || !routineRow) {
    return {
      success: false,
      error: routineError?.message ?? "Failed to create routine.",
    };
  }

  revalidatePath("/daily");
  return {
    success: true,
    routine: mapDailyRoutine(routineRow),
    blocks: [],
  };
}

export async function duplicateDailyRoutine(
  routineId: string,
): Promise<ActionResult<{ routine: DailyRoutine; blocks: DailyRoutineBlock[] }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const supabase = await createSupabaseServerClient();
  const { data: sourceRoutine, error: routineError } = await supabase
    .schema("axis")
    .from("daily_routines")
    .select("id,name,sort_order")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle<DailyRoutineRow>();

  if (routineError) {
    return { success: false, error: routineError.message };
  }
  if (!sourceRoutine) {
    return { success: false, error: "Routine not found." };
  }

  const { data: latest, error: latestError } = await supabase
    .schema("axis")
    .from("daily_routines")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (latestError) {
    return { success: false, error: latestError.message };
  }

  const nextSortOrder =
    latest && latest.length > 0 ? Number(latest[0].sort_order ?? -1) + 1 : 0;

  const { data: copiedRoutineRow, error: copyRoutineError } = await supabase
    .schema("axis")
    .from("daily_routines")
    .insert({
      user_id: userId,
      name: getCopiedRoutineName(sourceRoutine.name),
      sort_order: nextSortOrder,
    })
    .select("id,name,sort_order")
    .single<DailyRoutineRow>();

  if (copyRoutineError || !copiedRoutineRow) {
    return {
      success: false,
      error: copyRoutineError?.message ?? "Failed to copy routine.",
    };
  }

  const cleanupCopiedRoutine = async () => {
    await supabase
      .schema("axis")
      .from("daily_routines")
      .delete()
      .eq("id", copiedRoutineRow.id)
      .eq("user_id", userId);
  };

  const { data: sourceBlockRows, error: blocksError } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .select("id,routine_id,title,color,start_minute,end_minute,sort_order")
    .eq("routine_id", sourceRoutine.id)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("start_minute", { ascending: true });

  if (blocksError) {
    await cleanupCopiedRoutine();
    return { success: false, error: blocksError.message };
  }

  const sourceBlocks = (sourceBlockRows ?? []) as DailyRoutineBlockRow[];
  const sourceBlockIds = sourceBlocks.map((block) => block.id);
  const { data: sourceLinkRows, error: linksError } = sourceBlockIds.length
    ? await supabase
        .schema("axis")
        .from("daily_routine_block_items")
        .select("block_id,item_id,sort_order")
        .eq("user_id", userId)
        .in("block_id", sourceBlockIds)
    : { data: [], error: null };

  if (linksError) {
    await cleanupCopiedRoutine();
    return { success: false, error: linksError.message };
  }

  const createdBlockRows: DailyRoutineBlockRow[] = [];
  const copiedBlockIdsBySourceId = new Map<string, string>();

  for (const sourceBlock of sourceBlocks) {
    const { data: copiedBlock, error: blockCopyError } = await supabase
      .schema("axis")
      .from("daily_routine_blocks")
      .insert({
        user_id: userId,
        routine_id: copiedRoutineRow.id,
        title: sourceBlock.title,
        color: normalizeDailyRoutineBlockColor(sourceBlock.color),
        start_minute: sourceBlock.start_minute,
        end_minute: sourceBlock.end_minute,
        sort_order: sourceBlock.sort_order,
      })
      .select("id,routine_id,title,color,start_minute,end_minute,sort_order")
      .single<DailyRoutineBlockRow>();

    if (blockCopyError || !copiedBlock) {
      await cleanupCopiedRoutine();
      return {
        success: false,
        error: blockCopyError?.message ?? "Failed to copy a routine block.",
      };
    }

    createdBlockRows.push(copiedBlock);
    copiedBlockIdsBySourceId.set(sourceBlock.id, copiedBlock.id);
  }

  const copiedLinkRows = ((sourceLinkRows ?? []) as DailyRoutineBlockItemRow[])
    .map((link) => {
      const copiedBlockId = copiedBlockIdsBySourceId.get(link.block_id);
      if (!copiedBlockId) return null;
      return {
        user_id: userId,
        block_id: copiedBlockId,
        item_id: link.item_id,
        sort_order: link.sort_order,
      };
    })
    .filter((link): link is NonNullable<typeof link> => Boolean(link));

  if (copiedLinkRows.length > 0) {
    const { error: copyLinksError } = await supabase
      .schema("axis")
      .from("daily_routine_block_items")
      .insert(copiedLinkRows);

    if (copyLinksError) {
      await cleanupCopiedRoutine();
      return { success: false, error: copyLinksError.message };
    }
  }

  const copiedBlockKeys = Array.from(
    new Set(createdBlockRows.map((block) => getDailyRoutineBlockKey(block.title))),
  );
  const { data: sharedSubtaskRows, error: sharedSubtasksError } =
    copiedBlockKeys.length
      ? await supabase
          .schema("axis")
          .from("daily_routine_block_subtasks")
          .select("id,block_id,block_key,title,sort_order")
          .eq("user_id", userId)
          .in("block_key", copiedBlockKeys)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: [], error: null };

  if (sharedSubtasksError) {
    await cleanupCopiedRoutine();
    return { success: false, error: sharedSubtasksError.message };
  }

  const linkRowsForCopiedBlocks: DailyRoutineBlockItemRow[] = copiedLinkRows.map(
    (link) => ({
      block_id: link.block_id,
      item_id: link.item_id,
      sort_order: link.sort_order,
    }),
  );

  revalidatePath("/daily");
  return {
    success: true,
    routine: mapDailyRoutine(copiedRoutineRow),
    blocks: createdBlockRows.map((block) =>
      mapDailyRoutineBlock(
        block,
        linkRowsForCopiedBlocks,
        (sharedSubtaskRows ?? []) as DailyRoutineBlockSubtaskRow[],
      ),
    ),
  };
}

export async function updateDailyRoutineName(
  routineId: string,
  name: string,
): Promise<ActionResult<{ routine: DailyRoutine }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const normalizedName = normalizeDailyRoutineName(name);
  if (!normalizedName) {
    return { success: false, error: "Routine name is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_routines")
    .update({
      name: normalizedName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", routineId)
    .eq("user_id", userId)
    .select("id,name,sort_order")
    .maybeSingle<DailyRoutineRow>();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Could not update that routine.",
    };
  }

  revalidatePath("/daily");
  return { success: true, routine: mapDailyRoutine(data) };
}

export async function deleteDailyRoutine(
  routineId: string,
): Promise<ActionResult<{ routineId: string }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("axis")
    .from("daily_routines")
    .delete()
    .eq("id", routineId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/daily");
  return { success: true, routineId };
}

export async function createDailyRoutineBlock(
  routineId: string,
  title: string,
  startMinute: number,
  endMinute: number,
  color: DailyRoutineBlockColor,
): Promise<ActionResult<{ block: DailyRoutineBlock }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const normalizedTitle = normalizeDailyRoutineBlockTitle(title);
  if (!normalizedTitle) {
    return { success: false, error: "Block title is required." };
  }
  if (!isValidRoutineRange(startMinute, endMinute)) {
    return { success: false, error: "Choose a valid time range." };
  }
  const normalizedColor = normalizeDailyRoutineBlockColor(color);

  const supabase = await createSupabaseServerClient();
  const { data: routine, error: routineError } = await supabase
    .schema("axis")
    .from("daily_routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", userId)
    .maybeSingle();

  if (routineError) {
    return { success: false, error: routineError.message };
  }
  if (!routine) {
    return { success: false, error: "Routine not found." };
  }

  const { data, error } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .insert({
      user_id: userId,
      routine_id: routineId,
      title: normalizedTitle,
      color: normalizedColor,
      start_minute: startMinute,
      end_minute: endMinute,
      sort_order: startMinute,
    })
    .select("id,routine_id,title,color,start_minute,end_minute,sort_order")
    .single<DailyRoutineBlockRow>();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to add block." };
  }

  const subtaskRows = await loadDailyRoutineBlockSubtasksForKey(
    supabase,
    userId,
    getDailyRoutineBlockKey(data.title),
  );

  revalidatePath("/daily");
  return { success: true, block: mapDailyRoutineBlock(data, [], subtaskRows) };
}

export async function updateDailyRoutineBlock(
  blockId: string,
  title: string,
  startMinute: number,
  endMinute: number,
): Promise<ActionResult<{ block: DailyRoutineBlock }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const normalizedTitle = normalizeDailyRoutineBlockTitle(title);
  if (!normalizedTitle) {
    return { success: false, error: "Block title is required." };
  }
  if (!isValidRoutineRange(startMinute, endMinute)) {
    return { success: false, error: "Choose a valid time range." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .update({
      title: normalizedTitle,
      start_minute: startMinute,
      end_minute: endMinute,
      sort_order: startMinute,
      updated_at: new Date().toISOString(),
    })
    .eq("id", blockId)
    .eq("user_id", userId)
    .select("id,routine_id,title,color,start_minute,end_minute,sort_order")
    .maybeSingle<DailyRoutineBlockRow>();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Could not update that block.",
    };
  }

  const { data: linkRows } = await supabase
    .schema("axis")
    .from("daily_routine_block_items")
    .select("block_id,item_id,sort_order")
    .eq("user_id", userId)
    .eq("block_id", blockId);

  const subtaskRows = await loadDailyRoutineBlockSubtasksForKey(
    supabase,
    userId,
    getDailyRoutineBlockKey(data.title),
  );

  revalidatePath("/daily");
  return {
    success: true,
    block: mapDailyRoutineBlock(
      data,
      (linkRows ?? []) as DailyRoutineBlockItemRow[],
      subtaskRows,
    ),
  };
}

export async function updateDailyRoutineBlockColor(
  blockId: string,
  color: DailyRoutineBlockColor,
): Promise<ActionResult<{ block: DailyRoutineBlock }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const normalizedColor = normalizeDailyRoutineBlockColor(color);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .update({
      color: normalizedColor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", blockId)
    .eq("user_id", userId)
    .select("id,routine_id,title,color,start_minute,end_minute,sort_order")
    .maybeSingle<DailyRoutineBlockRow>();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Could not update that block color.",
    };
  }

  const { data: linkRows } = await supabase
    .schema("axis")
    .from("daily_routine_block_items")
    .select("block_id,item_id,sort_order")
    .eq("user_id", userId)
    .eq("block_id", blockId);

  const subtaskRows = await loadDailyRoutineBlockSubtasksForKey(
    supabase,
    userId,
    getDailyRoutineBlockKey(data.title),
  );

  revalidatePath("/daily");
  return {
    success: true,
    block: mapDailyRoutineBlock(
      data,
      (linkRows ?? []) as DailyRoutineBlockItemRow[],
      subtaskRows,
    ),
  };
}

export async function createDailyRoutineBlockSubtask(
  blockId: string,
  title: string,
): Promise<ActionResult<{ subtask: DailyRoutineBlockSubtask }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const normalizedTitle = normalizeDailyRoutineBlockSubtaskTitle(title);
  if (!normalizedTitle) {
    return { success: false, error: "Subtask is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: block, error: blockError } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .select("id,title")
    .eq("id", blockId)
    .eq("user_id", userId)
    .maybeSingle<Pick<DailyRoutineBlockRow, "id" | "title">>();

  if (blockError) {
    return { success: false, error: blockError.message };
  }
  if (!block) {
    return { success: false, error: "Block not found." };
  }

  const blockKey = getDailyRoutineBlockKey(block.title);
  const { data: latest, error: latestError } = await supabase
    .schema("axis")
    .from("daily_routine_block_subtasks")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("block_key", blockKey)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (latestError) {
    return { success: false, error: latestError.message };
  }

  const latestSort = latest?.[0]?.sort_order ?? -1;
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_routine_block_subtasks")
    .insert({
      user_id: userId,
      block_id: null,
      block_key: blockKey,
      title: normalizedTitle,
      sort_order: latestSort + 1,
    })
    .select("id,block_id,block_key,title,sort_order")
    .single<DailyRoutineBlockSubtaskRow>();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Could not add that subtask.",
    };
  }

  revalidatePath("/daily");
  return { success: true, subtask: mapDailyRoutineBlockSubtask(data) };
}

export async function updateDailyRoutineBlockSubtaskTitle(
  subtaskId: string,
  title: string,
): Promise<ActionResult<{ subtask: DailyRoutineBlockSubtask }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const normalizedTitle = normalizeDailyRoutineBlockSubtaskTitle(title);
  if (!normalizedTitle) {
    return { success: false, error: "Subtask is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_routine_block_subtasks")
    .update({
      title: normalizedTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subtaskId)
    .eq("user_id", userId)
    .select("id,block_id,block_key,title,sort_order")
    .maybeSingle<DailyRoutineBlockSubtaskRow>();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Could not update that subtask.",
    };
  }

  revalidatePath("/daily");
  return { success: true, subtask: mapDailyRoutineBlockSubtask(data) };
}

export async function reorderDailyRoutineBlockSubtasks(
  blockId: string,
  subtaskIds: string[],
): Promise<ActionResult<{ subtasks: DailyRoutineBlockSubtask[] }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const orderedIds = Array.from(new Set(subtaskIds)).filter(Boolean);
  const supabase = await createSupabaseServerClient();
  const { data: block, error: blockError } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .select("id,title")
    .eq("id", blockId)
    .eq("user_id", userId)
    .maybeSingle<Pick<DailyRoutineBlockRow, "id" | "title">>();

  if (blockError) {
    return { success: false, error: blockError.message };
  }
  if (!block) {
    return { success: false, error: "Block not found." };
  }

  const blockKey = getDailyRoutineBlockKey(block.title);
  if (orderedIds.length > 0) {
    const { data: rows, error: rowsError } = await supabase
      .schema("axis")
      .from("daily_routine_block_subtasks")
      .select("id")
      .eq("user_id", userId)
      .eq("block_key", blockKey)
      .in("id", orderedIds);

    if (rowsError) {
      return { success: false, error: rowsError.message };
    }
    if ((rows ?? []).length !== orderedIds.length) {
      return { success: false, error: "Subtask order is out of date." };
    }
  }

  for (const [index, subtaskId] of orderedIds.entries()) {
    const { error } = await supabase
      .schema("axis")
      .from("daily_routine_block_subtasks")
      .update({
        sort_order: index,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subtaskId)
      .eq("user_id", userId)
      .eq("block_key", blockKey);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  const subtaskRows = await loadDailyRoutineBlockSubtasksForKey(
    supabase,
    userId,
    blockKey,
  );

  revalidatePath("/daily");
  return {
    success: true,
    subtasks: subtaskRows.map(mapDailyRoutineBlockSubtask),
  };
}

export async function deleteDailyRoutineBlockSubtask(
  subtaskId: string,
): Promise<ActionResult<{ subtaskId: string }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("axis")
    .from("daily_routine_block_subtasks")
    .delete()
    .eq("id", subtaskId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/daily");
  return { success: true, subtaskId };
}

export async function loadDailyRoutineBlockSubtaskCompletions(
  dateKey: string,
): Promise<string[]> {
  const userId = await requireDailyUserId();
  if (!userId || !isValidDailyDateKey(dateKey)) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .schema("axis")
    .from("daily_routine_block_subtask_completions")
    .select("subtask_id")
    .eq("user_id", userId)
    .eq("date_key", dateKey);

  if (error) return [];
  return ((data ?? []) as DailyRoutineBlockSubtaskCompletionRow[]).map(
    (row) => row.subtask_id,
  );
}

export async function setDailyRoutineBlockSubtaskCompletion(
  subtaskId: string,
  dateKey: string,
  completed: boolean,
): Promise<ActionResult<{ subtaskId: string; dateKey: string; completed: boolean }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };
  if (!isValidDailyDateKey(dateKey)) {
    return { success: false, error: "Choose a valid date." };
  }

  const supabase = await createSupabaseServerClient();
  if (completed) {
    const { error } = await supabase
      .schema("axis")
      .from("daily_routine_block_subtask_completions")
      .upsert(
        {
          user_id: userId,
          subtask_id: subtaskId,
          date_key: dateKey,
        },
        { onConflict: "subtask_id,date_key" },
      );

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .schema("axis")
      .from("daily_routine_block_subtask_completions")
      .delete()
      .eq("user_id", userId)
      .eq("subtask_id", subtaskId)
      .eq("date_key", dateKey);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/daily");
  return {
    success: true,
    subtaskId,
    dateKey,
    completed,
  };
}

export async function deleteDailyRoutineBlock(
  blockId: string,
): Promise<ActionResult<{ blockId: string }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .delete()
    .eq("id", blockId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/daily");
  return { success: true, blockId };
}

export async function setDailyRoutineBlockChecklistItems(
  blockId: string,
  itemIds: string[],
): Promise<ActionResult<{ blockId: string; itemIds: string[] }>> {
  const userId = await requireDailyUserId();
  if (!userId) return { success: false, error: "Not signed in." };

  const uniqueItemIds = Array.from(new Set(itemIds.filter(Boolean))).slice(0, 24);
  const supabase = await createSupabaseServerClient();

  const { data: block, error: blockError } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .select("id")
    .eq("id", blockId)
    .eq("user_id", userId)
    .maybeSingle();

  if (blockError) {
    return { success: false, error: blockError.message };
  }
  if (!block) {
    return { success: false, error: "Block not found." };
  }

  if (uniqueItemIds.length > 0) {
    const { data: ownedItems, error: ownedError } = await supabase
      .schema("axis")
      .from("daily_checklist_items")
      .select("id")
      .eq("user_id", userId)
      .in("id", uniqueItemIds);

    if (ownedError) {
      return { success: false, error: ownedError.message };
    }
    if ((ownedItems ?? []).length !== uniqueItemIds.length) {
      return { success: false, error: "Could not link those items." };
    }
  }

  const { error: deleteError } = await supabase
    .schema("axis")
    .from("daily_routine_block_items")
    .delete()
    .eq("user_id", userId)
    .eq("block_id", blockId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  if (uniqueItemIds.length > 0) {
    const { error: insertError } = await supabase
      .schema("axis")
      .from("daily_routine_block_items")
      .insert(
        uniqueItemIds.map((itemId, index) => ({
          user_id: userId,
          block_id: blockId,
          item_id: itemId,
          sort_order: index,
        })),
      );

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  revalidatePath("/daily");
  return { success: true, blockId, itemIds: uniqueItemIds };
}
