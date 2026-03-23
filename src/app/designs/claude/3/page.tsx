import { getDomains } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

type DomainStatus = "ALIGNED" | "NEUTRAL" | "DRIFTING";

const statusSymbol: Record<DomainStatus, string> = {
  ALIGNED: "●",
  NEUTRAL: "◐",
  DRIFTING: "○",
};

const statusColor: Record<DomainStatus, string> = {
  ALIGNED: "text-white",
  NEUTRAL: "text-amber-400",
  DRIFTING: "text-red-400",
};

// Design 3: The Ledger
// A full-width brutalist table. No cards, no columns, no curves.
// The entire horizontal width is used — data reads left to right across the screen.
// Hover on any row inverts it to full white/black.
// Status is encoded as a unicode symbol: ● ◐ ○
// No max-width. No padding tricks. Raw grid.

export default async function Design3() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains = await getDomains(session.user.id);

  return (
    <main className="min-h-screen bg-black text-white font-mono">

      {/* Ledger header */}
      <header className="px-8 md:px-12 pt-12 pb-8 border-b-2 border-white">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-[0.5em] uppercase text-zinc-600 mb-3">
              Axis / Personal Alignment Ledger
            </p>
            <h1 className="text-2xl tracking-tight font-light">THE LEDGER</h1>
          </div>
          <div className="text-right text-[10px] tracking-widest uppercase text-zinc-700">
            <p>{domains.length} entries</p>
            <p className="mt-1">
              {domains.filter((d) => d.status === "DRIFTING").length} drifting
            </p>
          </div>
        </div>
      </header>

      {/* Column headers */}
      <div className="px-8 md:px-12 py-3 grid grid-cols-[3rem_12rem_8rem_1fr_1fr_3rem] gap-4 border-b border-zinc-800 text-[10px] tracking-[0.35em] uppercase text-zinc-700">
        <div>#</div>
        <div>Domain</div>
        <div>Status</div>
        <div>Identity</div>
        <div>Next move</div>
        <div />
      </div>

      {/* Domain rows */}
      <div>
        {domains.map((d, i) => {
          const status = d.status as DomainStatus;
          const index = String(i + 1).padStart(2, "0");

          return (
            <Link
              key={d.id}
              href={`/domain/${d.slug}`}
              className="group grid grid-cols-[3rem_12rem_8rem_1fr_1fr_3rem] gap-4 items-center px-8 md:px-12 py-6 border-b border-zinc-900 hover:bg-white hover:border-white transition-all duration-150 cursor-pointer"
            >
              {/* Index */}
              <div className="text-zinc-700 group-hover:text-black text-sm transition-colors">
                {index}
              </div>

              {/* Domain name */}
              <div>
                <span className="text-base tracking-wide text-white group-hover:text-black transition-colors">
                  {d.name.toUpperCase()}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`${statusColor[status]} group-hover:text-black transition-colors`}>
                  {statusSymbol[status]}
                </span>
                <span className="text-[10px] tracking-widest uppercase text-zinc-500 group-hover:text-zinc-700 transition-colors">
                  {d.status}
                </span>
              </div>

              {/* Identity */}
              <div>
                <p className="text-sm text-zinc-400 group-hover:text-zinc-700 leading-relaxed line-clamp-2 transition-colors">
                  {d.identity ?? "—"}
                </p>
              </div>

              {/* Next move */}
              <div>
                <p className="text-sm text-zinc-500 group-hover:text-zinc-700 leading-relaxed line-clamp-2 transition-colors">
                  {d.nextMove ?? "—"}
                </p>
              </div>

              {/* Arrow */}
              <div className="text-zinc-700 group-hover:text-black transition-colors text-sm justify-self-end">
                →
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="px-8 md:px-12 py-8 border-t border-zinc-900 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.35em] uppercase text-zinc-800">
          ● Aligned &nbsp;·&nbsp; ◐ Neutral &nbsp;·&nbsp; ○ Drifting
        </p>
        <Link
          href="/designs/claude"
          className="text-[10px] tracking-[0.3em] uppercase text-zinc-700 hover:text-white transition-colors"
        >
          ← Back
        </Link>
      </footer>
    </main>
  );
}
