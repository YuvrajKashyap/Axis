import {
  FOCUS_LIST_WEEKDAY,
  getDailyRoutineBlockKey,
  normalizeDailyRoutineBlockColor,
  type DailyChecklistItem,
  type DailyRoutine,
  type DailyRoutineBlock,
  type DailyRoutineBlockSubtask,
  type DailySettings,
} from "@/lib/daily-alignment";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DailyAlignmentView } from "./DailyAlignmentView";

type DailyItemRow = {
  id: string;
  weekday: number;
  label: string;
  sort_order: number;
};

type DailySettingsRow = {
  move_checked_to_bottom: boolean | null;
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

async function getDailyAlignmentData(userId: string): Promise<{
  items: DailyChecklistItem[];
  routines: DailyRoutine[];
  routineBlocks: DailyRoutineBlock[];
  settings: DailySettings;
}> {
  const supabase = await createSupabaseServerClient();
  const { data: itemRows, error: itemsError } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .select("id,weekday,label,sort_order")
    .eq("user_id", userId)
    .eq("weekday", FOCUS_LIST_WEEKDAY)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to load focus list: ${itemsError.message}`);
  }

  const { data: settingsRow, error: settingsError } = await supabase
    .schema("axis")
    .from("daily_checklist_settings")
    .select("move_checked_to_bottom")
    .eq("user_id", userId)
    .maybeSingle<DailySettingsRow>();

  if (settingsError) {
    throw new Error(`Failed to load daily settings: ${settingsError.message}`);
  }

  const { data: routineRows, error: routinesError } = await supabase
    .schema("axis")
    .from("daily_routines")
    .select("id,name,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (routinesError) {
    throw new Error(`Failed to load routines: ${routinesError.message}`);
  }

  const { data: blockRows, error: blocksError } = await supabase
    .schema("axis")
    .from("daily_routine_blocks")
    .select("id,routine_id,title,color,start_minute,end_minute,sort_order")
    .eq("user_id", userId)
    .order("start_minute", { ascending: true })
    .order("created_at", { ascending: true });

  if (blocksError) {
    throw new Error(`Failed to load routine blocks: ${blocksError.message}`);
  }

  const { data: linkRows, error: linksError } = await supabase
    .schema("axis")
    .from("daily_routine_block_items")
    .select("block_id,item_id,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (linksError) {
    throw new Error(`Failed to load routine links: ${linksError.message}`);
  }

  const { data: subtaskRows, error: subtasksError } = await supabase
    .schema("axis")
    .from("daily_routine_block_subtasks")
    .select("id,block_id,block_key,title,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (subtasksError) {
    throw new Error(`Failed to load routine subtasks: ${subtasksError.message}`);
  }

  const links = (linkRows ?? []) as DailyRoutineBlockItemRow[];
  const subtasks = (subtaskRows ?? []) as DailyRoutineBlockSubtaskRow[];
  const subtasksByBlockKey = subtasks.reduce<Record<string, DailyRoutineBlockSubtask[]>>(
    (map, subtask) => {
      map[subtask.block_key] = map[subtask.block_key] ?? [];
      map[subtask.block_key].push({
        id: subtask.id,
        blockId: subtask.block_id,
        blockKey: subtask.block_key,
        title: subtask.title,
        sortOrder: subtask.sort_order,
      });
      return map;
    },
    {},
  );

  return {
    items: ((itemRows ?? []) as DailyItemRow[])
      .map((item) => ({
        id: item.id,
        weekday: FOCUS_LIST_WEEKDAY,
        label: item.label,
        sortOrder: item.sort_order,
      })),
    routines: ((routineRows ?? []) as DailyRoutineRow[]).map((routine) => ({
      id: routine.id,
      name: routine.name,
      sortOrder: routine.sort_order,
    })),
    routineBlocks: ((blockRows ?? []) as DailyRoutineBlockRow[]).map((block) => {
      const blockKey = getDailyRoutineBlockKey(block.title);
      return {
        id: block.id,
        routineId: block.routine_id,
        title: block.title,
        blockKey,
        color: normalizeDailyRoutineBlockColor(block.color),
        startMinute: block.start_minute,
        endMinute: block.end_minute,
        sortOrder: block.sort_order,
        checklistItemIds: links
          .filter((link) => link.block_id === block.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((link) => link.item_id),
        subtasks: subtasksByBlockKey[blockKey] ?? [],
      };
    }),
    settings: {
      moveCheckedToBottom: settingsRow?.move_checked_to_bottom ?? false,
    },
  };
}

export default async function DailyPage() {
  const user = await requireSupabaseUser();
  const { items, routines, routineBlocks, settings } =
    await getDailyAlignmentData(user.id);

  return (
    <DailyAlignmentView
      items={items}
      routines={routines}
      routineBlocks={routineBlocks}
      settings={settings}
    />
  );
}
