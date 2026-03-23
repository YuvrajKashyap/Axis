import { getDomains } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

type DomainStatus = "ALIGNED" | "NEUTRAL" | "DRIFTING";

const statusTag: Record<DomainStatus, { label: string; cls: string }> = {
  ALIGNED: { label: "ALIGNED", cls: "text-white border-white/40" },
  NEUTRAL: { label: "NEUTRAL", cls: "text-amber-400 border-amber-400/40" },
  DRIFTING: { label: "BREAKING", cls: "text-red-400 border-red-400/60" },
};

const sectionLabel: Record<DomainStatus, string> = {
  ALIGNED: "IN ORDER",
  NEUTRAL: "WATCH",
  DRIFTING: "CRITICAL",
};

// Design 4: The Headline
// A dark newspaper front page. AXIS as masthead.
// Each domain is a news story with its own column weight.
// The lead story (first domain) takes 60% of the horizontal space.
// The remaining two domains are stacked in the right column.
// Domain name = headline, identity = article lede, next move = pull quote.
// No cards. No borders on stories — just column gutters.
// Reads like The New York Times front page at 2am on black.

export default async function Design4() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains = await getDomains(session.user.id);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lead = domains[0];
  const secondary = domains.slice(1);

  return (
    <main className="min-h-screen bg-[#050505] text-white">

      {/* Masthead */}
      <header className="border-b-2 border-white px-8 md:px-12 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-600">
            Est. 2026 &nbsp;·&nbsp; Anti-Algorithm Edition
          </div>
          <div className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-600">
            {dateStr}
          </div>
        </div>
        <div className="text-center border-t border-b border-zinc-800 py-4">
          <h1 className="text-4xl md:text-5xl font-light tracking-[0.6em] uppercase">
            A X I S
          </h1>
          <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mt-2">
            Personal Alignment Dispatch &nbsp;·&nbsp; Open → Reset → Act
          </p>
        </div>
        <div className="flex items-center justify-between mt-3 text-[10px] font-mono tracking-widest uppercase text-zinc-700">
          <span>{domains.length} domains active</span>
          <span>
            {domains.filter((d) => d.status === "DRIFTING").length} critical
          </span>
        </div>
      </header>

      {/* Front page grid */}
      <div className="px-8 md:px-12 py-8 grid grid-cols-1 md:grid-cols-12 gap-0 md:divide-x md:divide-zinc-900">

        {/* Lead story — 7 columns */}
        {lead && (
          <div className="md:col-span-7 md:pr-10 pb-8 md:pb-0">
            <div className="mb-6">
              <span className={`text-[10px] font-mono tracking-[0.4em] uppercase border px-2 py-0.5 ${statusTag[lead.status as DomainStatus].cls}`}>
                {sectionLabel[lead.status as DomainStatus]}
              </span>
            </div>

            <Link href={`/domain/${lead.slug}`} className="group block">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-6 group-hover:text-zinc-200 transition-colors">
                {lead.name}
              </h2>
            </Link>

            <div className="h-px w-full bg-zinc-800 mb-6" />

            {lead.identity && (
              <p className="text-base md:text-lg font-light text-zinc-300 leading-relaxed mb-6 max-w-lg">
                {lead.identity}
              </p>
            )}

            {lead.primaryReason && (
              <p className="text-sm text-zinc-500 leading-relaxed mb-8 max-w-md">
                {lead.primaryReason}
              </p>
            )}

            {lead.nextMove && (
              <div className="border-l-2 border-zinc-700 pl-4 mb-8">
                <p className="text-[10px] font-mono tracking-widest uppercase text-zinc-600 mb-2">
                  NEXT MOVE
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed italic">
                  &ldquo;{lead.nextMove}&rdquo;
                </p>
              </div>
            )}

            <Link
              href={`/domain/${lead.slug}`}
              className="text-[10px] font-mono tracking-[0.35em] uppercase text-zinc-500 hover:text-white transition-colors border-b border-zinc-700 hover:border-white pb-0.5"
            >
              Continue reading →
            </Link>
          </div>
        )}

        {/* Secondary stories — 5 columns */}
        <div className="md:col-span-5 md:pl-10 flex flex-col divide-y divide-zinc-900">
          {secondary.map((d) => {
            const status = d.status as DomainStatus;

            return (
              <div key={d.id} className="py-8 first:pt-0">
                <div className="mb-4">
                  <span className={`text-[10px] font-mono tracking-[0.4em] uppercase border px-2 py-0.5 ${statusTag[status].cls}`}>
                    {sectionLabel[status]}
                  </span>
                </div>

                <Link href={`/domain/${d.slug}`} className="group block">
                  <h3 className="text-2xl md:text-3xl font-light leading-tight tracking-tight mb-4 group-hover:text-zinc-200 transition-colors">
                    {d.name}
                  </h3>
                </Link>

                <div className="h-px w-full bg-zinc-900 mb-4" />

                {d.identity && (
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    {d.identity}
                  </p>
                )}

                {d.nextMove && (
                  <p className="text-xs text-zinc-600 leading-relaxed mb-4 italic">
                    {d.nextMove}
                  </p>
                )}

                <Link
                  href={`/domain/${d.slug}`}
                  className="text-[10px] font-mono tracking-[0.35em] uppercase text-zinc-600 hover:text-white transition-colors"
                >
                  Enter →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer rule */}
      <footer className="border-t border-zinc-900 px-8 md:px-12 py-5 flex items-center justify-between">
        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-800">
          All rights reserved. No algorithm. No distraction.
        </p>
        <Link
          href="/designs/claude"
          className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-700 hover:text-white transition-colors"
        >
          ← Back
        </Link>
      </footer>
    </main>
  );
}
