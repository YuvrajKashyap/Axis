import { getDomains, getDemoDomains, isAdmin, getOrCreateDemoUserId } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { Orrery } from "./Orrery";
import type { DomainData } from "./Orrery";
import { DEMO_DOMAINS } from "@/lib/demo-data";

function toOrreryData(domains: Awaited<ReturnType<typeof getDomains>>): DomainData[] {
  return domains.map((d) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    status: d.effectiveStatus as DomainData["status"],
    identity: d.identity,
    nextMove: d.nextMove,
    primaryReason: d.primaryReason,
    positionX: d.positionX,
    color: d.color ?? null,
    autoDrifted: d.autoDrifted,
  }));
}

type HomePageProps = {
  searchParams: Promise<{ demo?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  const { demo } = await searchParams;

  // Not logged in: show demo orrery (from DB), fall back to hardcoded
  if (!session?.user?.id) {
    const demoDomains = await getDemoDomains();
    if (demoDomains && demoDomains.length > 0) {
      return <Orrery domains={toOrreryData(demoDomains)} isDemo />;
    }
    return <Orrery domains={DEMO_DOMAINS} isDemo />;
  }

  const admin = await isAdmin(session.user.email);

  // Admin editing demo mode: load demo user's domains, fully editable
  if (admin && demo === "edit") {
    const demoUserId = await getOrCreateDemoUserId();
    if (demoUserId) {
      const demoDomains = await getDomains(demoUserId);
      return <Orrery domains={toOrreryData(demoDomains)} isAdmin editingDemo demoUserId={demoUserId} />;
    }
  }

  // Normal logged-in user: show their own orrery
  const domains = await getDomains(session.user.id);
  return <Orrery domains={toOrreryData(domains)} isAdmin={admin} />;
}
