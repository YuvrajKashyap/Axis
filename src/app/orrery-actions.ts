"use server";

import { scheduleDomainDriftWarning } from "@/lib/drift-warning";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAuthorizedTargetUserId } from "@/lib/target-user";
import { revalidatePath } from "next/cache";

type OrbitUpdate = {
  id: string;
  radius: number;
};

type ForceAlignDomainRow = {
  id: string;
  slug: string;
  commitment_requirement: "STANDARD" | "PASSIVE_ALIGNMENT" | "SUBTASKS" | null;
};

type ForceAlignDomainsResult =
  | { success: true; alignedDomainIds: string[] }
  | { success: false; error: string };

const FORCE_ALIGNMENT_COMMITMENT_TEXT = "Forced alignment.";
const FORCE_ALIGNMENT_ORDER_STEP_MS = 1;

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

export async function forceAlignDomains(
  domainIds: string[],
  targetUserId?: string,
): Promise<ForceAlignDomainsResult> {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return { success: false, error: "Not signed in." };
  }

  const uniqueDomainIds = Array.from(
    new Set(domainIds.map((id) => id.trim()).filter(Boolean)),
  );

  if (uniqueDomainIds.length === 0) {
    return { success: false, error: "Choose at least one planet." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: loadError } = await supabase
    .schema("axis")
    .from("domains")
    .select("id,slug,commitment_requirement")
    .eq("user_id", userId)
    .in("id", uniqueDomainIds);

  if (loadError) {
    return { success: false, error: loadError.message };
  }

  const loadedDomains = (data ?? []) as ForceAlignDomainRow[];
  const domainsById = new Map(
    loadedDomains.map((domain) => [domain.id, domain]),
  );
  const orderedDomains = uniqueDomainIds
    .map((domainId) => domainsById.get(domainId))
    .filter((domain): domain is ForceAlignDomainRow => Boolean(domain));

  if (orderedDomains.length === 0) {
    return { success: false, error: "No matching planets found." };
  }

  const lastAlignmentMs = Date.now();
  const firstAlignmentMs =
    lastAlignmentMs -
    Math.max(0, orderedDomains.length - 1) * FORCE_ALIGNMENT_ORDER_STEP_MS;
  const alignmentDatesByDomainId = new Map(
    orderedDomains.map((domain, index) => [
      domain.id,
      new Date(firstAlignmentMs + index * FORCE_ALIGNMENT_ORDER_STEP_MS),
    ]),
  );
  const getAlignmentDate = (domainId: string) =>
    alignmentDatesByDomainId.get(domainId) ?? new Date(lastAlignmentMs);
  const standardDomains = orderedDomains.filter(
    (domain) => (domain.commitment_requirement ?? "STANDARD") === "STANDARD",
  );
  const passiveLikeDomains = orderedDomains.filter(
    (domain) => (domain.commitment_requirement ?? "STANDARD") !== "STANDARD",
  );

  if (standardDomains.length > 0) {
    const { error: insertError } = await supabase
      .schema("axis")
      .from("commitments")
      .insert(
        standardDomains.map((domain) => {
          const alignmentAtIso = getAlignmentDate(domain.id).toISOString();
          return {
            domain_id: domain.id,
            user_id: userId,
            text: FORCE_ALIGNMENT_COMMITMENT_TEXT,
            created_at: alignmentAtIso,
            updated_at: alignmentAtIso,
          };
        }),
      );

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    for (const domain of standardDomains) {
      const alignmentAtIso = getAlignmentDate(domain.id).toISOString();
      const { error: updateError } = await supabase
        .schema("axis")
        .from("domains")
        .update({ status: "ALIGNED", updated_at: alignmentAtIso })
        .eq("user_id", userId)
        .eq("id", domain.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }
  }

  for (const domain of passiveLikeDomains) {
    const alignmentAtIso = getAlignmentDate(domain.id).toISOString();
    const { error: updateError } = await supabase
      .schema("axis")
      .from("domains")
      .update({
        status: "ALIGNED",
        last_passive_alignment_at: alignmentAtIso,
        updated_at: alignmentAtIso,
      })
      .eq("user_id", userId)
      .eq("id", domain.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  await Promise.all(
    orderedDomains.map(async (domain) => {
      try {
        const isStandard =
          (domain.commitment_requirement ?? "STANDARD") === "STANDARD";
        const alignmentAt = getAlignmentDate(domain.id);
        await scheduleDomainDriftWarning(domain.id, {
          source: isStandard ? "commitment" : "passive-alignment",
          status: "ALIGNED",
          ...(isStandard
            ? {
                lastCommitmentAt: alignmentAt,
                lastCommitmentText: FORCE_ALIGNMENT_COMMITMENT_TEXT,
              }
            : { lastPassiveAlignmentAt: alignmentAt }),
        });
      } catch (error) {
        console.error("Failed to schedule drift warning after force align", {
          domainId: domain.id,
          error,
        });
      }
    }),
  );

  revalidatePath("/");
  orderedDomains.forEach((domain) => revalidatePath(`/domain/${domain.slug}`));

  return {
    success: true,
    alignedDomainIds: orderedDomains.map((domain) => domain.id),
  };
}

export async function createDomain(name: string, overrideUserId?: string): Promise<{ success: boolean; error?: string; slug?: string }> {
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
  return { success: true, slug };
}
