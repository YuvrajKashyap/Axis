import { getDomains, type DomainListStatus } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const statusIndicator: Record<
  DomainListStatus,
  { symbol: string; color: string; label: string }
> = {
  ALIGNED: { symbol: "●", color: "text-white", label: "ALIGNED" },
  NEUTRAL: { symbol: "◐", color: "text-amber-400", label: "NEUTRAL" },
  DRIFTING: { symbol: "○", color: "text-red-400", label: "DRIFTING" },
  ARCHIVED: { symbol: "◌", color: "text-zinc-500", label: "ARCHIVED" },
};

// Design 2: The Broadcast
// Each domain occupies a tall section, framed as an intercepted transmission.
// A horizontal header "tape" at the top of each section reads like a
// signal header: TRANSMISSION 01/03 -------- STATUS
// Below: domain name at display size, identity as the broadcast body,
// next move as the operational directive.
// Layout is stacked vertically with thick white dividers between transmissions.
// Nothing grid-like. Nothing card-like. Pure sequential signal reading.

export default async function Design2() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains = await getDomains(session.user.id);

  const now = new Date();
  const timeCode = now.toISOString().slice(0, 19).replace("T", " ");

  return (
    <main className="min-h-screen bg-[#030303] text-white">
      <header className="flex items-center justify-between border-b-2 border-white px-8 py-4 md:px-14">
        <div className="flex items-center gap-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-400">
            AXIS.BROADCAST
          </span>
          <span className="font-mono text-[10px] text-zinc-700">
            {timeCode}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            LIVE
          </span>
        </div>
      </header>

      {domains.map((domain, index) => {
        const status = domain.status;
        const indicator = statusIndicator[status];
        const itemIndex = String(index + 1).padStart(2, "0");
        const total = String(domains.length).padStart(2, "0");

        return (
          <section key={domain.id} className="border-b border-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-8 py-3 md:px-14">
              <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest">
                <span className="text-zinc-600">
                  TRANSMISSION {itemIndex}/{total}
                </span>
                <span className="text-zinc-800">--------</span>
                <span className="text-zinc-600">
                  DOMAIN: {domain.name.toUpperCase()}
                </span>
              </div>
              <div
                className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${indicator.color}`}
              >
                <span>{indicator.symbol}</span>
                <span>{indicator.label}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 px-8 py-16 md:grid-cols-12 md:gap-16 md:px-14 md:py-20">
              <div className="md:col-span-7">
                <Link href={`/domain/${domain.slug}`} className="group block">
                  <h2 className="mb-10 text-5xl font-light leading-none tracking-tight text-white transition-colors group-hover:text-zinc-200 md:text-7xl lg:text-8xl">
                    {domain.name}
                  </h2>
                  <div className="h-px w-0 bg-white transition-all duration-700 group-hover:w-24" />
                </Link>
              </div>

              <div className="md:col-span-5 flex flex-col justify-between gap-10">
                {domain.identity && (
                  <div>
                    <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">
                      SIGNAL BODY
                    </p>
                    <p className="text-base font-light leading-relaxed text-zinc-300 md:text-lg">
                      {domain.identity}
                    </p>
                  </div>
                )}

                {domain.nextMove && (
                  <div>
                    <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">
                      DIRECTIVE
                    </p>
                    <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                      {domain.nextMove}
                    </p>
                    <Link
                      href={`/domain/${domain.slug}`}
                      className="inline-flex items-center gap-3 border border-zinc-800 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 transition-colors hover:border-zinc-600 hover:text-white"
                    >
                      EXECUTE DOMAIN <span>→</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}

      <div className="flex items-center justify-between border-t border-zinc-900 px-8 py-10 md:px-14">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-800">
          END OF BROADCAST - {domains.length} TRANSMISSIONS RECEIVED
        </p>
        <Link
          href="/designs/claude"
          className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-700 transition-colors hover:text-white"
        >
          ← BACK
        </Link>
      </div>
    </main>
  );
}
