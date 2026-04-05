import {
  getDomains,
  getDemoDomains,
  isAdmin,
  getOrCreateDemoUserId,
  type DomainList,
  type DomainListItem,
} from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { Orrery } from "./Orrery";
import type { DomainData } from "./Orrery";
import { DEMO_DOMAINS } from "@/lib/demo-data";
import { normalizeDomainSettings } from "@/lib/domain-settings";

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
    settings: normalizeDomainSettings({
      driftMode: domain.driftMode,
      driftThresholdHours: domain.driftThresholdHours,
      commitmentRequirement: domain.commitmentRequirement,
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
  const session = await auth();
  const { demo, pulseDomain } = await searchParams;

  // Not logged in: show demo orrery (from DB), fall back to hardcoded
  if (!session?.user?.id) {
    const demoDomains = await getDemoDomains();
    if (demoDomains && demoDomains.length > 0) {
      return <Orrery domains={toOrreryData(demoDomains)} isDemo returnPulseDomainId={pulseDomain ?? null} />;
    }
    return <Orrery domains={DEMO_DOMAINS} isDemo returnPulseDomainId={pulseDomain ?? null} />;
  }

  const admin = await isAdmin(session.user.email);

  // Admin editing demo mode: load demo user's domains, fully editable
  if (admin && demo === "edit") {
    const demoUserId = await getOrCreateDemoUserId();
    if (demoUserId) {
      const demoDomains = await getDomains(demoUserId, { disableAutoDrift: true });
      return <Orrery domains={toOrreryData(demoDomains)} isAdmin editingDemo demoUserId={demoUserId} returnPulseDomainId={pulseDomain ?? null} />;
    }
  }

  // Normal logged-in user: show their own orrery
  const domains = await getDomains(session.user.id);
  return <Orrery domains={toOrreryData(domains)} isAdmin={admin} returnPulseDomainId={pulseDomain ?? null} />;
}
