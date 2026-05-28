import { normalizeDomainSettings } from "@/lib/domain-settings";
import { isAdmin } from "@/lib/get-data";
import { restoreLegacyIfNeededForCurrentUser } from "@/lib/restore-legacy";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import { notFound, redirect } from "next/navigation";
import { DomainSettingsView } from "./DomainSettingsView";

type DomainSettingsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ align?: string; idx?: string; demoUser?: string }>;
};

const DOMAIN_SETTINGS_SELECT =
  "id,name,slug,color,position_x,drift_mode,drift_threshold_hours,warning_lead_hours,commitment_requirement,subtask_reset_mode,subtask_time_zone,orbit_speed,visual_intensity,planet_size_scale,orbit_eccentricity";
const LEGACY_DOMAIN_SETTINGS_SELECT =
  "id,name,slug,color,position_x,drift_mode,drift_threshold_hours,warning_lead_hours,commitment_requirement,orbit_speed,visual_intensity,planet_size_scale,orbit_eccentricity";

function isMissingSubtaskSchemaError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("subtask_reset_mode") ||
    message.includes("subtask_time_zone") ||
    message.includes("domain_subtasks")
  );
}

async function getDomainSettingsDetail(userId: string, slug: string) {
  const supabase = await createSupabaseServerClient();
  let domainResult = await supabase
    .schema("axis")
    .from("domains")
    .select(DOMAIN_SETTINGS_SELECT)
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (isMissingSubtaskSchemaError(domainResult.error)) {
    domainResult = await supabase
      .schema("axis")
      .from("domains")
      .select(LEGACY_DOMAIN_SETTINGS_SELECT)
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
  }

  const { data, error } = domainResult;

  if (error) {
    throw new Error(`Failed to load domain settings: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const { data: subtasks, error: subtasksError } = await supabase
    .schema("axis")
    .from("domain_subtasks")
    .select("id,label,sort_order")
    .eq("domain_id", data.id)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (subtasksError && !isMissingSubtaskSchemaError(subtasksError)) {
    throw new Error(`Failed to load domain subtasks: ${subtasksError.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    color: data.color,
    positionX: data.position_x,
    driftMode: data.drift_mode,
    driftThresholdHours: data.drift_threshold_hours,
    warningLeadHours: data.warning_lead_hours,
    commitmentRequirement: data.commitment_requirement,
    subtaskResetMode: data.subtask_reset_mode,
    subtaskTimeZone: data.subtask_time_zone,
    subtasks: (subtasksError ? [] : subtasks ?? []).map((subtask) => ({
      id: subtask.id,
      label: subtask.label,
      sortOrder: subtask.sort_order,
    })),
    orbitSpeed: data.orbit_speed,
    visualIntensity: data.visual_intensity,
    planetSizeScale: data.planet_size_scale,
    orbitEccentricity: data.orbit_eccentricity,
  };
}

export default async function DomainSettingsPage({
  params,
  searchParams,
}: DomainSettingsPageProps) {
  const user = await requireSupabaseUser();

  const { slug } = await params;
  const { align, idx, demoUser } = await searchParams;

  let targetUserId = user.id;
  if (demoUser) {
    const admin = await isAdmin(user.email);
    if (!admin) redirect("/");
    targetUserId = demoUser;
  } else {
    await restoreLegacyIfNeededForCurrentUser();
  }

  const domain = await getDomainSettingsDetail(targetUserId, slug);
  if (!domain) notFound();

  const backParams = new URLSearchParams();
  if (demoUser) backParams.set("demoUser", demoUser);
  if (align) backParams.set("align", align);
  if (idx) backParams.set("idx", idx);
  const backHref = backParams.toString()
    ? `/domain/${domain.slug}?${backParams.toString()}`
    : `/domain/${domain.slug}`;
  const homeHref = demoUser ? "/?demo=edit" : "/";

  return (
    <DomainSettingsView
      domain={{
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        color: domain.color,
        positionX: domain.positionX,
      }}
      settings={normalizeDomainSettings({
        driftMode: domain.driftMode,
        driftThresholdHours: domain.driftThresholdHours,
        warningLeadHours: domain.warningLeadHours,
        commitmentRequirement: domain.commitmentRequirement,
        subtaskResetMode: domain.subtaskResetMode,
        subtaskTimeZone: domain.subtaskTimeZone,
        subtasks: domain.subtasks,
        orbitSpeed: domain.orbitSpeed,
        visualIntensity: domain.visualIntensity,
        planetSizeScale: domain.planetSizeScale,
        orbitEccentricity: domain.orbitEccentricity,
      })}
      backHref={backHref}
      homeHref={homeHref}
      targetUserId={demoUser}
    />
  );
}
