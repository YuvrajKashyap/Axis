"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseUser } from "@/lib/supabase-auth";
import { revalidatePath } from "next/cache";

type ResetCommitmentEntry = {
  domainId: string;
  text: string;
};

type AllowedDomainRow = {
  id: string;
};

export async function submitResetCommitments(
  entries: ResetCommitmentEntry[],
) {
  const user = await getSupabaseUser();
  const userId = user?.id;
  if (!userId) return;

  const sanitizedEntries: ResetCommitmentEntry[] = entries
    .map((entry: ResetCommitmentEntry) => ({
      domainId: entry.domainId,
      text: entry.text.trim(),
    }))
    .filter((entry: ResetCommitmentEntry) => entry.text.length > 0);

  if (sanitizedEntries.length === 0) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: allowedDomains, error: allowedDomainsError } = await supabase
    .schema("axis")
    .from("domains")
    .select("id")
    .eq("user_id", userId)
    .in(
      "id",
      sanitizedEntries.map((entry: ResetCommitmentEntry) => entry.domainId),
    );

  if (allowedDomainsError || !allowedDomains) {
    return;
  }

  const allowedDomainIds = new Set(
    allowedDomains.map((domain: AllowedDomainRow) => domain.id),
  );
  const writableEntries = sanitizedEntries.filter((entry: ResetCommitmentEntry) =>
    allowedDomainIds.has(entry.domainId),
  );

  if (writableEntries.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .schema("axis")
    .from("commitments")
    .insert(
      writableEntries.map((entry: ResetCommitmentEntry) => ({
        domain_id: entry.domainId,
        text: entry.text,
        user_id: userId,
      })),
    );

  if (insertError) {
    throw new Error(`Failed to create reset commitments: ${insertError.message}`);
  }

  revalidatePath("/", "layout");
}
