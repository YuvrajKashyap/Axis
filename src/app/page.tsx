import {
  getDomains,
  getOrCreateDemoUserId,
  isAdmin,
  type DomainList,
  type DomainListItem,
} from "@/lib/get-data";
import { normalizeDomainSettings } from "@/lib/domain-settings";
import { getPublicDemoOrrery } from "@/lib/get-public-demo";
import { restoreLegacyIfNeededForCurrentUser } from "@/lib/restore-legacy";
import { getSupabaseUser } from "@/lib/supabase-auth";
import { Orrery } from "./Orrery";
import type { DomainData } from "./Orrery";

function toOrreryData(domains: DomainList): DomainData[] {
  return domains.map((domain: DomainListItem) => ({
    id: domain.id,
    name: domain.name,
    slug: domain.slug,
    status: domain.effectiveStatus as DomainData["status"],
    identity: domain.identity,
    nextMove: domain.nextMove,
    primaryReason: domain.primaryReason,
    positionX: domain.positionX,
    color: domain.color ?? null,
    autoDrifted: domain.autoDrifted,
    lastCommitmentAt: domain.lastCommitmentAt?.toISOString() ?? null,
    lastRelevantActivityAt: domain.lastRelevantActivityAt?.toISOString() ?? null,
    updatedAt: domain.updatedAt.toISOString(),
    settings: normalizeDomainSettings({
      driftMode: domain.driftMode,
      driftThresholdHours: domain.driftThresholdHours,
      warningLeadHours: domain.warningLeadHours,
      commitmentRequirement: domain.commitmentRequirement,
      subtaskResetMode: domain.subtaskResetMode,
      subtaskTimeZone: domain.subtaskTimeZone,
      orbitSpeed: domain.orbitSpeed,
      visualIntensity: domain.visualIntensity,
      planetSizeScale: domain.planetSizeScale,
      orbitEccentricity: domain.orbitEccentricity,
    }),
  }));
}

type HomePageProps = {
  searchParams: Promise<{ demo?: string; pulseDomain?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getSupabaseUser();
  const { demo, pulseDomain } = await searchParams;

  if (!user) {
    const demoDomains = await getPublicDemoOrrery();

    return (
      <Orrery
        domains={demoDomains}
        isDemo
        returnPulseDomainId={pulseDomain ?? null}
      />
    );
  }

  const admin = await isAdmin(user.email);

  // Admin editing demo mode: load demo user's domains, fully editable
  if (admin && demo === "edit") {
    const demoUserId = await getOrCreateDemoUserId();
    if (demoUserId) {
      const demoDomains = await getDomains(demoUserId, {
        disableAutoDrift: true,
      });
      return (
        <Orrery
          domains={toOrreryData(demoDomains)}
          isAdmin
          editingDemo
          demoUserId={demoUserId}
          returnPulseDomainId={pulseDomain ?? null}
        />
      );
    }

    console.warn(
      "Admin demo edit mode is unavailable because DEMO_USER_ID is not configured.",
    );
  }

  // Normal logged-in user: show their own orrery
  await restoreLegacyIfNeededForCurrentUser();
  const domains = await getDomains(user.id);
  return (
    <Orrery
      domains={toOrreryData(domains)}
      isAdmin={admin}
      returnPulseDomainId={pulseDomain ?? null}
    />
  );
}
