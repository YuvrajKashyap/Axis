"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAuthorizedTargetUserId } from "@/lib/target-user";
import { revalidatePath } from "next/cache";

type OrbitUpdate = {
  id: string;
  radius: number;
};

export async function updateOrbit(
  domainId: string,
  normalizedRadius: number,
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("axis")
    .from("domains")
    .update({ position_x: normalizedRadius })
    .eq("id", domainId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update orbit: ${error.message}`);
  }
}

export async function resetOrbits(
  updates: OrbitUpdate[],
  targetUserId?: string,
) {
  if (updates.length === 0) {
    return;
  }

  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await Promise.all(
    updates.map((update: OrbitUpdate) =>
      supabase
        .schema("axis")
        .from("domains")
        .update({ position_x: update.radius })
        .eq("id", update.id)
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) {
            throw new Error(`Failed to reset orbit: ${error.message}`);
          }
        }),
    ),
  );
  revalidatePath("/");
}

export async function createDomain(name: string, overrideUserId?: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthorizedTargetUserId(overrideUserId);
  if (!userId) return { success: false, error: "Not signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Name is required." };

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!slug) return { success: false, error: "Invalid name." };

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .schema("axis")
    .from("domains")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (existing) return { success: false, error: "A domain with that name already exists." };

  const { error: insertError } = await supabase
    .schema("axis")
    .from("domains")
    .insert({
      name: trimmed,
      slug,
      user_id: userId,
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath("/");
  return { success: true };
}
