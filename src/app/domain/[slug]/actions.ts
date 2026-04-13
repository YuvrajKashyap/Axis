'use server';

import { scheduleDomainDriftWarning } from "@/lib/drift-warning";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAuthorizedTargetUserId } from "@/lib/target-user";
import { revalidatePath } from "next/cache";

type CreateCommitmentResult =
  | { success: true }
  | { success: false; error: string };

type CommitmentRecord = {
  id: string;
  text: string;
  createdAt: string;
};

async function scheduleDomainDriftWarningSafely(domainId: string) {
  try {
    const result = await scheduleDomainDriftWarning(domainId);
    if (result.reason === "processed-now") {
      console.info("Drift warning processed immediately after domain mutation", {
        domainId,
      });
    } else if (!result.scheduled) {
      console.warn("Drift warning was not scheduled after domain mutation", {
        domainId,
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error("Failed to schedule drift warning after domain mutation", {
      domainId,
      error,
    });
  }
}

export async function updateDomainStatus(
  domainId: string,
  status: "ALIGNED" | "DRIFTING" | "ARCHIVED",
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
    .update({ status })
    .eq("id", domainId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update domain status: ${error.message}`);
  }

  await scheduleDomainDriftWarningSafely(domainId);
  revalidatePath("/");
}

export async function updateDomainColor(
  domainId: string,
  color: string,
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
    .update({ color })
    .eq("id", domainId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update domain color: ${error.message}`);
  }
  revalidatePath("/");
}

export async function createCommitment(
  domainId: string,
  text: string,
  targetUserId?: string,
): Promise<CreateCommitmentResult> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return {
      success: false,
      error: "Commitment text is required.",
    };
  }

  try {
    const userId = await getAuthorizedTargetUserId(targetUserId);
    if (!userId) {
      return { success: false, error: "Not signed in." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: domain, error: domainError } = await supabase
      .schema("axis")
      .from("domains")
      .select("id")
      .eq("id", domainId)
      .eq("user_id", userId)
      .maybeSingle();

    if (domainError) {
      return { success: false, error: domainError.message };
    }

    if (!domain) {
      return { success: false, error: "Domain not found." };
    }

    const { data: insertedCommitment, error: insertError } = await supabase
      .schema("axis")
      .from("commitments")
      .insert({
        domain_id: domain.id,
        text: trimmedText,
        user_id: userId,
      })
      .select("created_at")
      .single();

    if (insertError) {
      console.error("Failed to insert commitment", {
        domainId,
        userId,
        error: insertError,
      });
      return { success: false, error: insertError.message };
    }

    const commitmentCreatedAt = insertedCommitment?.created_at
      ? new Date(insertedCommitment.created_at)
      : new Date();
    const { error: alignError } = await supabase
      .schema("axis")
      .from("domains")
      .update({ status: "ALIGNED" })
      .eq("id", domain.id)
      .eq("user_id", userId);

    if (alignError) {
      console.error("Failed to realign domain after commitment", {
        domainId,
        userId,
        error: alignError,
      });
    }

    try {
      const result = await scheduleDomainDriftWarning(domain.id, {
        status: "ALIGNED",
        lastCommitmentAt: commitmentCreatedAt,
        lastCommitmentText: trimmedText,
      });
      if (result.reason === "processed-now") {
        console.info("Drift warning processed immediately after domain mutation", {
          domainId: domain.id,
        });
      } else if (!result.scheduled) {
        console.warn("Drift warning was not scheduled after domain mutation", {
          domainId: domain.id,
          reason: result.reason,
        });
      }
    } catch (error) {
      console.error("Failed to schedule drift warning after domain mutation", {
        domainId: domain.id,
        error,
      });
    }
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to create commitment", { domainId, error });
    return {
      success: false,
      error: "Failed to create commitment.",
    };
  }
}

export async function recordPassiveAlignmentTouch(
  domainId: string,
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return { success: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data: domain, error: domainError } = await supabase
    .schema("axis")
    .from("domains")
    .select("id, commitment_requirement")
    .eq("id", domainId)
    .eq("user_id", userId)
    .maybeSingle();

  if (domainError) {
    return { success: false };
  }

  if (!domain || domain.commitment_requirement !== "PASSIVE_ALIGNMENT") {
    return { success: false };
  }

  const alignedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .schema("axis")
    .from("domains")
    .update({
      status: "ALIGNED",
      last_passive_alignment_at: alignedAt,
    })
    .eq("id", domain.id)
    .eq("user_id", userId);

  if (updateError) {
    return { success: false };
  }

  try {
    const result = await scheduleDomainDriftWarning(domain.id, {
      status: "ALIGNED",
      lastPassiveAlignmentAt: new Date(alignedAt),
    });
    if (result.reason === "processed-now") {
      console.info("Drift warning processed immediately after domain mutation", {
        domainId: domain.id,
      });
    } else if (!result.scheduled) {
      console.warn("Drift warning was not scheduled after domain mutation", {
        domainId: domain.id,
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error("Failed to schedule drift warning after domain mutation", {
      domainId: domain.id,
      error,
    });
  }
  revalidatePath("/");
  return { success: true };
}

export async function loadAllCommitments(
  domainId: string,
  targetUserId?: string,
): Promise<CommitmentRecord[]> {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data: commitments, error } = await supabase
    .schema("axis")
    .from("commitments")
    .select("id, text, created_at")
    .eq("domain_id", domainId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !commitments) {
    return [];
  }

  return commitments.map((commitment) => ({
    id: commitment.id,
    text: commitment.text,
    createdAt: commitment.created_at,
  }));
}

export async function clearCommitments(domainId: string, targetUserId?: string) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("axis")
    .from("commitments")
    .delete()
    .eq("domain_id", domainId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to clear commitments: ${error.message}`);
  }
  revalidatePath("/");
}

export async function deleteDomain(domainId: string, targetUserId?: string) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error: commitmentsError } = await supabase
    .schema("axis")
    .from("commitments")
    .delete()
    .eq("domain_id", domainId)
    .eq("user_id", userId);

  if (commitmentsError) {
    throw new Error(`Failed to delete commitments: ${commitmentsError.message}`);
  }

  const { error: domainError } = await supabase
    .schema("axis")
    .from("domains")
    .delete()
    .eq("id", domainId)
    .eq("user_id", userId);

  if (domainError) {
    throw new Error(`Failed to delete domain: ${domainError.message}`);
  }
  revalidatePath("/");
}

export async function updateDomainName(
  domainId: string,
  name: string,
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  const trimmed = name.trim();
  if (!userId || !trimmed) return;

  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!slug) return;

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .schema("axis")
    .from("domains")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", slug)
    .neq("id", domainId)
    .maybeSingle();

  if (existingError) return;

  if (existing) return;

  const { error } = await supabase
    .schema("axis")
    .from("domains")
    .update({ name: trimmed, slug })
    .eq("id", domainId)
    .eq("user_id", userId);

  if (error) return;
  revalidatePath("/");
}

export async function updateDomainFields(
  domainId: string,
  fields: {
    identity?: string;
    vision?: string;
    primaryReason?: string;
    primaryCost?: string;
  },
  targetUserId?: string,
) {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return;
  }

  const update: {
    identity?: string;
    vision?: string;
    primary_reason?: string;
    primary_cost?: string;
  } = {};

  if (fields.identity !== undefined) update.identity = fields.identity;
  if (fields.vision !== undefined) update.vision = fields.vision;
  if (fields.primaryReason !== undefined) {
    update.primary_reason = fields.primaryReason;
  }
  if (fields.primaryCost !== undefined) {
    update.primary_cost = fields.primaryCost;
  }

  if (Object.keys(update).length === 0) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .schema("axis")
    .from("domains")
    .update(update)
    .eq("id", domainId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update domain fields: ${error.message}`);
  }
  revalidatePath("/");
}
