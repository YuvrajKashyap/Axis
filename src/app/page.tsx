import { getDomains, getDemoDomainsFromAdmin } from "@/lib/get-data";
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

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    // Not logged in: show admin's orrery as demo, fall back to hardcoded
    const adminDomains = await getDemoDomainsFromAdmin();
    if (adminDomains && adminDomains.length > 0) {
      return <Orrery domains={toOrreryData(adminDomains)} isDemo />;
    }
    return <Orrery domains={DEMO_DOMAINS} isDemo />;
  }

  const domains = await getDomains(session.user.id);
  return <Orrery domains={toOrreryData(domains)} />;
}
