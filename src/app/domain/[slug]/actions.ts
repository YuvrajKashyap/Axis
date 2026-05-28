'use server';

import { scheduleDomainDriftWarning } from "@/lib/drift-warning";
import { getSubtaskCompletionKey } from "@/lib/domain-settings";
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

type SetSubtaskCompletionResult =
  | {
      success: true;
      completedSubtaskIds: string[];
      aligned: boolean;
      reset: boolean;
    }
  | { success: false; error: string };

async function scheduleDomainDriftWarningSafely(domainId: string) {
  try {
    const result = await scheduleDomainDriftWarning(domainId, {
      source: "status-update",
    });
    if (result.reason === "processed-now") {
      console.info("Drift warning processed immediately after domain mutation", {
        domainId,
        source: "status-update",
      });
    } else if (!result.scheduled) {
      console.warn("Drift warning was not scheduled after domain mutation", {
        domainId,
        source: "status-update",
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error("Failed to schedule drift warning after domain mutation", {
      domainId,
      source: "status-update",
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

    console.info("Drift warning refresh detected", {
      domainId: domain.id,
      userId,
      source: "commitment",
      commitmentCreatedAt: commitmentCreatedAt.toISOString(),
    });

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
        source: "commitment",
        status: "ALIGNED",
        lastCommitmentAt: commitmentCreatedAt,
        lastCommitmentText: trimmedText,
      });
      if (result.reason === "processed-now") {
        console.info("Drift warning processed immediately after domain mutation", {
          domainId: domain.id,
          source: "commitment",
        });
      } else if (!result.scheduled) {
        console.warn("Drift warning was not scheduled after domain mutation", {
          domainId: domain.id,
          source: "commitment",
          reason: result.reason,
        });
      }
    } catch (error) {
      console.error("Failed to schedule drift warning after domain mutation", {
        domainId: domain.id,
        source: "commitment",
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
  console.info("Drift warning refresh detected", {
    domainId: domain.id,
    userId,
    source: "passive-alignment",
    passiveAlignmentAt: alignedAt,
  });

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
      source: "passive-alignment",
      status: "ALIGNED",
      lastPassiveAlignmentAt: new Date(alignedAt),
    });
    if (result.reason === "processed-now") {
      console.info("Drift warning processed immediately after domain mutation", {
        domainId: domain.id,
        source: "passive-alignment",
      });
    } else if (!result.scheduled) {
      console.warn("Drift warning was not scheduled after domain mutation", {
        domainId: domain.id,
        source: "passive-alignment",
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error("Failed to schedule drift warning after domain mutation", {
      domainId: domain.id,
      source: "passive-alignment",
      error,
    });
  }
  revalidatePath("/");
  return { success: true };
}

export async function setDomainSubtaskCompletion(
  domainId: string,
  subtaskId: string,
  completed: boolean,
  targetUserId?: string,
): Promise<SetSubtaskCompletionResult> {
  const userId = await getAuthorizedTargetUserId(targetUserId);
  if (!userId) {
    return { success: false, error: "Not signed in." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: domain, error: domainError } = await supabase
    .schema("axis")
    .from("domains")
    .select("id,slug,commitment_requirement,subtask_reset_mode,subtask_time_zone")
    .eq("id", domainId)
    .eq("user_id", userId)
    .maybeSingle();

  if (domainError) {
    return { success: false, error: domainError.message };
  }

  if (!domain) {
    return { success: false, error: "Domain not found." };
  }

  if (domain.commitment_requirement !== "SUBTASKS") {
    return {
      success: false,
      error: "This domain is not configured for subtasks.",
    };
  }

  const { data: subtask, error: subtaskError } = await supabase
    .schema("axis")
    .from("domain_subtasks")
    .select("id")
    .eq("id", subtaskId)
    .eq("domain_id", domain.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (subtaskError) {
    return { success: false, error: subtaskError.message };
  }

  if (!subtask) {
    return { success: false, error: "Subtask not found." };
  }

  const periodKey = getSubtaskCompletionKey(
    domain.subtask_reset_mode ?? "DAILY",
    domain.subtask_time_zone ?? "UTC",
  );
  const completedAt = new Date();

  if (completed) {
    const { error: upsertError } = await supabase
      .schema("axis")
      .from("domain_subtask_completions")
      .upsert(
        {
          domain_id: domain.id,
          user_id: userId,
          subtask_id: subtask.id,
          period_key: periodKey,
          completed_at: completedAt.toISOString(),
        },
        { onConflict: "subtask_id,period_key" },
      );

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }
  } else {
    const { error: deleteError } = await supabase
      .schema("axis")
      .from("domain_subtask_completions")
      .delete()
      .eq("domain_id", domain.id)
      .eq("user_id", userId)
      .eq("subtask_id", subtask.id)
      .eq("period_key", periodKey);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }
  }

  const { data: subtasks, error: subtasksError } = await supabase
    .schema("axis")
    .from("domain_subtasks")
    .select("id")
    .eq("domain_id", domain.id)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (subtasksError) {
    return { success: false, error: subtasksError.message };
  }

  const subtaskIds = (subtasks ?? []).map((item) => item.id);
  const { data: completions, error: completionsError } = await supabase
    .schema("axis")
    .from("domain_subtask_completions")
    .select("subtask_id")
    .eq("domain_id", domain.id)
    .eq("user_id", userId)
    .eq("period_key", periodKey)
    .in("subtask_id", subtaskIds);

  if (completionsError) {
    return { success: false, error: completionsError.message };
  }

  const completedSubtaskIds = new Set(
    (completions ?? []).map((completion) => completion.subtask_id),
  );
  const aligned =
    completed &&
    subtaskIds.length > 0 &&
    subtaskIds.every((id) => completedSubtaskIds.has(id));
  let reset = false;

  if (aligned) {
    const { error: alignError } = await supabase
      .schema("axis")
      .from("domains")
      .update({
        status: "ALIGNED",
        last_passive_alignment_at: completedAt.toISOString(),
      })
      .eq("id", domain.id)
      .eq("user_id", userId);

    if (alignError) {
      return { success: false, error: alignError.message };
    }

    if (domain.subtask_reset_mode === "DRIFT_CYCLE") {
      const { error: resetError } = await supabase
        .schema("axis")
        .from("domain_subtask_completions")
        .delete()
        .eq("domain_id", domain.id)
        .eq("user_id", userId)
        .eq("period_key", periodKey);

      if (resetError) {
        return { success: false, error: resetError.message };
      }

      completedSubtaskIds.clear();
      reset = true;
    }

    try {
      const result = await scheduleDomainDriftWarning(domain.id, {
        source: "subtasks",
        status: "ALIGNED",
        lastPassiveAlignmentAt: completedAt,
      });
      if (result.reason === "processed-now") {
        console.info("Drift warning processed immediately after subtask completion", {
          domainId: domain.id,
          source: "subtasks",
        });
      } else if (!result.scheduled) {
        console.warn("Drift warning was not scheduled after subtask completion", {
          domainId: domain.id,
          source: "subtasks",
          reason: result.reason,
        });
      }
    } catch (error) {
      console.error("Failed to schedule drift warning after subtask completion", {
        domainId: domain.id,
        source: "subtasks",
        error,
      });
    }
  }

  revalidatePath("/");
  revalidatePath(`/domain/${domain.slug}`);

  return {
    success: true,
    completedSubtaskIds: Array.from(completedSubtaskIds),
    aligned,
    reset,
  };
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
