import { isAdmin } from "@/lib/get-data";
import {
  getSubtaskCompletionKey,
  normalizeDomainSettings,
} from "@/lib/domain-settings";
import { restoreLegacyIfNeededForCurrentUser } from "@/lib/restore-legacy";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import { notFound, redirect } from "next/navigation";
import { DomainView } from "./DomainView";

type DomainPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ align?: string; idx?: string; demoUser?: string }>;
};

const DOMAIN_DETAIL_SELECT =
  "id,name,slug,status,color,identity,vision,primary_reason,primary_cost,current_reality,drift_mode,drift_threshold_hours,warning_lead_hours,commitment_requirement,subtask_reset_mode,subtask_time_zone,orbit_speed,visual_intensity,planet_size_scale,orbit_eccentricity";
const LEGACY_DOMAIN_DETAIL_SELECT =
  "id,name,slug,status,color,identity,vision,primary_reason,primary_cost,current_reality,drift_mode,drift_threshold_hours,warning_lead_hours,commitment_requirement,orbit_speed,visual_intensity,planet_size_scale,orbit_eccentricity";

function isMissingSubtaskSchemaError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("subtask_reset_mode") ||
    message.includes("subtask_time_zone") ||
    message.includes("domain_subtasks") ||
    message.includes("domain_subtask_completions")
  );
}

async function getDomainDetail(userId: string, slug: string) {
  const supabase = await createSupabaseServerClient();
  let domainResult = await supabase
    .schema("axis")
    .from("domains")
    .select(DOMAIN_DETAIL_SELECT)
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (isMissingSubtaskSchemaError(domainResult.error)) {
    domainResult = await supabase
      .schema("axis")
      .from("domains")
      .select(LEGACY_DOMAIN_DETAIL_SELECT)
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
  }

  const { data: domain, error: domainError } = domainResult;

  if (domainError) {
    throw new Error(`Failed to load domain: ${domainError.message}`);
  }

  if (!domain) {
    return null;
  }

  const { data: commitments, error: commitmentsError } = await supabase
    .schema("axis")
    .from("commitments")
    .select("id,text,created_at")
    .eq("domain_id", domain.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (commitmentsError) {
    throw new Error(
      `Failed to load domain commitments: ${commitmentsError.message}`,
    );
  }

  const { data: subtasks, error: subtasksError } = await supabase
    .schema("axis")
    .from("domain_subtasks")
    .select("id,label,sort_order")
    .eq("domain_id", domain.id)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (subtasksError && !isMissingSubtaskSchemaError(subtasksError)) {
    throw new Error(`Failed to load domain subtasks: ${subtasksError.message}`);
  }

  const normalizedSettings = normalizeDomainSettings({
    driftMode: domain.drift_mode,
    driftThresholdHours: domain.drift_threshold_hours,
    warningLeadHours: domain.warning_lead_hours,
    commitmentRequirement: domain.commitment_requirement,
    subtaskResetMode: domain.subtask_reset_mode,
    subtaskTimeZone: domain.subtask_time_zone,
    subtasks: (subtasksError ? [] : subtasks ?? []).map((subtask) => ({
      id: subtask.id,
      label: subtask.label,
      sortOrder: subtask.sort_order,
    })),
    orbitSpeed: domain.orbit_speed,
    visualIntensity: domain.visual_intensity,
    planetSizeScale: domain.planet_size_scale,
    orbitEccentricity: domain.orbit_eccentricity,
  });

  const subtaskCompletionKey = getSubtaskCompletionKey(
    normalizedSettings.subtaskResetMode,
    normalizedSettings.subtaskTimeZone,
  );
  const subtaskIds = normalizedSettings.subtasks.map((subtask) => subtask.id);
  const completedSubtasksById = new Map<string, string>();

  if (subtaskIds.length > 0) {
    const { data: completions, error: completionsError } = await supabase
      .schema("axis")
      .from("domain_subtask_completions")
      .select("subtask_id,completed_at")
      .eq("domain_id", domain.id)
      .eq("user_id", userId)
      .eq("period_key", subtaskCompletionKey)
      .in("subtask_id", subtaskIds);

    if (completionsError && !isMissingSubtaskSchemaError(completionsError)) {
      throw new Error(
        `Failed to load domain subtask progress: ${completionsError.message}`,
      );
    }

    for (const completion of (completionsError ? [] : completions ?? [])) {
      completedSubtasksById.set(completion.subtask_id, completion.completed_at);
    }
  }

  return {
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    status: domain.status,
    color: domain.color,
    identity: domain.identity,
    vision: domain.vision,
    primaryReason: domain.primary_reason,
    primaryCost: domain.primary_cost,
    currentReality: domain.current_reality,
    driftMode: domain.drift_mode,
    driftThresholdHours: domain.drift_threshold_hours,
    warningLeadHours: domain.warning_lead_hours,
    commitmentRequirement: domain.commitment_requirement,
    subtaskResetMode: domain.subtask_reset_mode,
    subtaskTimeZone: domain.subtask_time_zone,
    orbitSpeed: domain.orbit_speed,
    visualIntensity: domain.visual_intensity,
    planetSizeScale: domain.planet_size_scale,
    orbitEccentricity: domain.orbit_eccentricity,
    commitments: (commitments ?? []).map((commitment) => ({
      id: commitment.id,
      text: commitment.text,
      createdAt: new Date(commitment.created_at),
    })),
    settings: normalizedSettings,
    subtasks: normalizedSettings.subtasks.map((subtask) => ({
      ...subtask,
      completedAt: completedSubtasksById.get(subtask.id) ?? null,
    })),
  };
}

type DomainDetail = NonNullable<Awaited<ReturnType<typeof getDomainDetail>>>;
type DomainCommitment = DomainDetail["commitments"][number];

export default async function DomainDetailPage({ params, searchParams }: DomainPageProps) {
  const user = await requireSupabaseUser();

  const { slug } = await params;
  const { align, idx, demoUser } = await searchParams;

  // If demoUser param is set, admin is editing the demo orrery
  let targetUserId = user.id;
  if (demoUser) {
    const admin = await isAdmin(user.email);
    if (!admin) redirect("/");
    targetUserId = demoUser;
  } else {
    await restoreLegacyIfNeededForCurrentUser();
  }

  const domain = await getDomainDetail(targetUserId, slug);

  if (!domain) notFound();

  // Parse align chain if present
  const alignSlugs = align ? align.split(",") : null;
  const alignIdx = idx ? parseInt(idx, 10) : 0;

  return (
    <DomainView
      domain={domain}
      settings={domain.settings}
      commitments={domain.commitments.map((commitment: DomainCommitment) => ({
        ...commitment,
        createdAt: commitment.createdAt.toISOString(),
      }))}
      subtasks={domain.subtasks}
      alignChain={alignSlugs}
      alignIdx={alignIdx}
      demoUser={demoUser}
    />
  );
}
