import { getDomains } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

type DomainStatus = "ALIGNED" | "NEUTRAL" | "DRIFTING";

const statusIndicator: Record<DomainStatus, { symbol: string; color: string; label: string }> = {
  ALIGNED: { symbol: "●", color: "text-white", label: "ALIGNED" },
  NEUTRAL: { symbol: "◐", color: "text-amber-400", label: "NEUTRAL" },
  DRIFTING: { symbol: "○", color: "text-red-400", label: "DRIFTING" },
};

// Design 2: The Broadcast
// Each domain occupies a tall section, framed as an intercepted transmission.
// A horizontal header "tape" at the top of each section reads like a
// signal header: TRANSMISSION 01/03 ——————— STATUS
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

      {/* System header */}
      <header className="border-b-2 border-white px-8 md:px-14 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-400">
            AXIS.BROADCAST
          </span>
          <span className="text-[10px] font-mono text-zinc-700">
            {timeCode}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500">
            LIVE
          </span>
        </div>
      </header>

      {/* Transmission blocks */}
      {domains.map((d, i) => {
        const status = d.status as DomainStatus;
        const ind = statusIndicator[status];
        const index = String(i + 1).padStart(2, "0");
        const total = String(domains.length).padStart(2, "0");

        return (
          <section key={d.id} className="border-b border-zinc-900">
            {/* Transmission tape */}
            <div className="border-b border-zinc-800 px-8 md:px-14 py-3 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-4 font-mono text-[10px] tracking-widest uppercase">
                <span className="text-zinc-600">
                  TRANSMISSION {index}/{total}
                </span>
                <span className="text-zinc-800">————————</span>
                <span className="text-zinc-600">
                  DOMAIN: {d.name.toUpperCase()}
                </span>
              </div>
              <div className={`flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase ${ind.color}`}>
                <span>{ind.symbol}</span>
                <span>{ind.label}</span>
              </div>
            </div>

            {/* Transmission body */}
            <div className="px-8 md:px-14 py-16 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16">

              {/* Domain name — display scale */}
              <div className="md:col-span-7">
                <Link href={`/domain/${d.slug}`} className="group block">
                  <h2 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight leading-none text-white group-hover:text-zinc-200 transition-colors mb-10">
                    {d.name}
                  </h2>
                  <div className="h-px w-0 bg-white group-hover:w-24 transition-all duration-700" />
                </Link>
              </div>

              {/* Body text */}
              <div className="md:col-span-5 flex flex-col justify-between gap-10">
                {d.identity && (
                  <div>
                    <p className="text-[10px] font-mono tracking-[0.35em] uppercase text-zinc-600 mb-4">
                      SIGNAL BODY
                    </p>
                    <p className="text-base md:text-lg font-light text-zinc-300 leading-relaxed">
                      {d.identity}
                    </p>
                  </div>
                )}

                {d.nextMove && (
                  <div>
                    <p className="text-[10px] font-mono tracking-[0.35em] uppercase text-zinc-600 mb-4">
                      DIRECTIVE
                    </p>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                      {d.nextMove}
                    </p>
                    <Link
                      href={`/domain/${d.slug}`}
                      className="inline-flex items-center gap-3 text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-600 px-5 py-3"
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

      {/* End of transmission */}
      <div className="px-8 md:px-14 py-10 flex items-center justify-between border-t border-zinc-900">
        <p className="text-[10px] font-mono tracking-[0.35em] uppercase text-zinc-800">
          END OF BROADCAST — {domains.length} TRANSMISSIONS RECEIVED
        </p>
        <Link
          href="/designs/claude"
          className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-700 hover:text-white transition-colors"
        >
          ← BACK
        </Link>
      </div>
    </main>
  );
}
