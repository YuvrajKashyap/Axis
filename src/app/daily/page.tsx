import {
  DAILY_WEEKDAYS,
  type DailyChecklistItem,
  type DailySettings,
  type DailyWeekdayValue,
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

async function getDailyAlignmentData(userId: string): Promise<{
  items: DailyChecklistItem[];
  settings: DailySettings;
}> {
  const supabase = await createSupabaseServerClient();
  const { data: itemRows, error: itemsError } = await supabase
    .schema("axis")
    .from("daily_checklist_items")
    .select("id,weekday,label,sort_order")
    .eq("user_id", userId)
    .order("weekday", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to load daily checklist: ${itemsError.message}`);
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

  const validWeekdays = new Set(DAILY_WEEKDAYS.map((day) => day.value));

  return {
    items: ((itemRows ?? []) as DailyItemRow[])
      .filter((item) => validWeekdays.has(item.weekday as DailyWeekdayValue))
      .map((item) => ({
        id: item.id,
        weekday: item.weekday as DailyWeekdayValue,
        label: item.label,
        sortOrder: item.sort_order,
      })),
    settings: {
      moveCheckedToBottom: settingsRow?.move_checked_to_bottom ?? false,
    },
  };
}

export default async function DailyPage() {
  const user = await requireSupabaseUser();
  const { items, settings } = await getDailyAlignmentData(user.id);

  return <DailyAlignmentView items={items} settings={settings} />;
}
