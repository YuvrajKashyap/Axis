import {
  getDomains,
  type DomainList,
  type DomainListItem,
  type DomainListStatus,
} from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const statusSymbol: Record<DomainListStatus, string> = {
  ALIGNED: "●",
  NEUTRAL: "◐",
  DRIFTING: "○",
  ARCHIVED: "◌",
};

const statusColor: Record<DomainListStatus, string> = {
  ALIGNED: "text-white",
  NEUTRAL: "text-amber-400",
  DRIFTING: "text-red-400",
  ARCHIVED: "text-zinc-500",
};

// Design 3: The Ledger
// A full-width brutalist table. No cards, no columns, no curves.
// The entire horizontal width is used - data reads left to right across the screen.
// Hover on any row inverts it to full white/black.
// Status is encoded as a unicode symbol: ● ◐ ○
// No max-width. No padding tricks. Raw grid.

export default async function Design3() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains: DomainList = await getDomains(session.user.id);

  return (
    <main className="min-h-screen bg-black font-mono text-white">
      <header className="border-b-2 border-white px-8 pb-8 pt-12 md:px-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.5em] text-zinc-600">
              Axis / Personal Alignment Ledger
            </p>
            <h1 className="text-2xl font-light tracking-tight">THE LEDGER</h1>
          </div>
          <div className="text-right text-[10px] uppercase tracking-widest text-zinc-700">
            <p>{domains.length} entries</p>
            <p className="mt-1">
              {domains.filter((domain: DomainListItem) => domain.status === "DRIFTING").length}{" "}
              drifting
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[3rem_12rem_8rem_1fr_1fr_3rem] gap-4 border-b border-zinc-800 px-8 py-3 text-[10px] uppercase tracking-[0.35em] text-zinc-700 md:px-12">
        <div>#</div>
        <div>Domain</div>
        <div>Status</div>
        <div>Identity</div>
        <div>Next move</div>
        <div />
      </div>

      <div>
        {domains.map((domain: DomainListItem, index: number) => {
          const status = domain.status;
          const itemIndex = String(index + 1).padStart(2, "0");

          return (
            <Link
              key={domain.id}
              href={`/domain/${domain.slug}`}
              className="group grid cursor-pointer grid-cols-[3rem_12rem_8rem_1fr_1fr_3rem] items-center gap-4 border-b border-zinc-900 px-8 py-6 transition-all duration-150 hover:border-white hover:bg-white md:px-12"
            >
              <div className="text-sm text-zinc-700 transition-colors group-hover:text-black">
                {itemIndex}
              </div>

              <div>
                <span className="text-base tracking-wide text-white transition-colors group-hover:text-black">
                  {domain.name.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`${statusColor[status]} transition-colors group-hover:text-black`}
                >
                  {statusSymbol[status]}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-zinc-700">
                  {domain.status}
                </span>
              </div>

              <div>
                <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400 transition-colors group-hover:text-zinc-700">
                  {domain.identity ?? "-"}
                </p>
              </div>

              <div>
                <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-700">
                  {domain.nextMove ?? "-"}
                </p>
              </div>

              <div className="justify-self-end text-sm text-zinc-700 transition-colors group-hover:text-black">
                →
              </div>
            </Link>
          );
        })}
      </div>

      <footer className="flex items-center justify-between border-t border-zinc-900 px-8 py-8 md:px-12">
        <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-800">
          ● Aligned · ◐ Neutral · ○ Drifting · ◌ Archived
        </p>
        <Link
          href="/designs/claude"
          className="text-[10px] uppercase tracking-[0.3em] text-zinc-700 transition-colors hover:text-white"
        >
          ← Back
        </Link>
      </footer>
    </main>
  );
}
