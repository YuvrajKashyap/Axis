import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseUser } from "@/lib/supabase-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSupabaseUser();
  const userId = user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: domains, error } = await supabase
    .schema("axis")
    .from("domains")
    .select(
      "name,slug,status,color,identity,vision,primary_reason,primary_cost,position_x",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (domains ?? []).map((domain) => ({
      name: domain.name,
      slug: domain.slug,
      status: domain.status,
      color: domain.color,
      identity: domain.identity,
      vision: domain.vision,
      primaryReason: domain.primary_reason,
      primaryCost: domain.primary_cost,
      positionX: domain.position_x,
    })),
  );
}
