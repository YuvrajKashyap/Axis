import { createSupabaseServerClient } from "@/lib/supabase-server";
import { restoreLegacyIfNeededForCurrentUser } from "@/lib/restore-legacy";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import { ResetFlow } from "./ResetFlow";

export default async function ResetPage() {
  const user = await requireSupabaseUser();
  await restoreLegacyIfNeededForCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { data: domains, error } = await supabase
    .schema("axis")
    .from("domains")
    .select("id,name,slug,identity,next_move,color")
    .eq("user_id", user.id)
    .neq("status", "ARCHIVED")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load reset domains: ${error.message}`);
  }

  return (
    <ResetFlow
      domains={(domains ?? []).map((domain) => ({
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        identity: domain.identity,
        nextMove: domain.next_move,
        color: domain.color,
      }))}
    />
  );
}
