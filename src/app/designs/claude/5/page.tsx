import { getDomains } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

type DomainStatus = "ALIGNED" | "NEUTRAL" | "DRIFTING";

const stampConfig: Record<DomainStatus, { label: string; cls: string; border: string }> = {
  ALIGNED: {
    label: "ALIGNED",
    cls: "text-white border-white/50",
    border: "border-l-white/30",
  },
  NEUTRAL: {
    label: "NEUTRAL",
    cls: "text-amber-400 border-amber-400/50",
    border: "border-l-amber-400/20",
  },
  DRIFTING: {
    label: "DRIFTING",
    cls: "text-red-400 border-red-500/60",
    border: "border-l-red-500/20",
  },
};

// Design 5: The Archive
// Case file drawer aesthetic. Each domain is a "case" — a document object
// with a thick top border, case number, and status rubber-stamp.
// Stacked vertically (not in a grid).
// Layout reads like a physical stack of files on a desk.
// Status: bold uppercase stamp in the top-right, rotated slightly.
// Primary reason = case summary. Next move = recommended action.
// Unlike every other design here — deliberately bureaucratic and heavy.

export default async function Design5() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains = await getDomains(session.user.id);

  const caseYear = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-3xl px-8 py-16">

        {/* Archive header */}
        <div className="mb-16 pb-8 border-b border-zinc-800">
          <p className="text-[10px] font-mono tracking-[0.5em] uppercase text-zinc-700 mb-3">
            AXIS / Personal Domain Archive / {caseYear}
          </p>
          <h1 className="text-2xl font-light tracking-tight text-white">
            Case Files
          </h1>
          <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
            {domains.length} active cases. Review each. Act on one.
          </p>
        </div>

        {/* Case files */}
        <div className="space-y-8">
          {domains.map((d, i) => {
            const status = d.status as DomainStatus;
            const cfg = stampConfig[status];
            const caseNum = `CASE-${String(i + 1).padStart(3, "0")}-${caseYear}`;

            return (
              <div
                key={d.id}
                className={`relative border border-zinc-800 border-l-4 ${cfg.border} bg-zinc-950 hover:bg-black transition-colors group`}
              >
                {/* Case file top bar */}
                <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-zinc-800/60">
                  <div>
                    <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-600 mb-1">
                      {caseNum}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-light tracking-tight text-white">
                      {d.name}
                    </h2>
                  </div>

                  {/* Status stamp */}
                  <div className={`border px-3 py-1.5 font-mono text-[10px] tracking-[0.4em] uppercase ${cfg.cls} shrink-0 mt-1`}
                    style={{ transform: "rotate(1.5deg)" }}>
                    {cfg.label}
                  </div>
                </div>

                {/* Case body */}
                <div className="px-7 py-6 space-y-6">
                  {/* Identity */}
                  {d.identity && (
                    <div>
                      <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-700 mb-2">
                        SUBJECT DECLARATION
                      </p>
                      <p className="text-base text-zinc-300 leading-relaxed font-light">
                        &ldquo;{d.identity}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Two-column detail */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {d.primaryReason && (
                      <div>
                        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-700 mb-2">
                          REASON FOR CASE
                        </p>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          {d.primaryReason}
                        </p>
                      </div>
                    )}
                    {d.primaryCost && (
                      <div>
                        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-700 mb-2">
                          COST OF INACTION
                        </p>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                          {d.primaryCost}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Recommended action */}
                  {d.nextMove && (
                    <div className="border-t border-zinc-800/60 pt-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-700 mb-2">
                          RECOMMENDED ACTION
                        </p>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {d.nextMove}
                        </p>
                      </div>
                      <Link
                        href={`/domain/${d.slug}`}
                        className="shrink-0 self-end text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-600 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-600 px-4 py-2.5 group-hover:border-zinc-700"
                      >
                        OPEN →
                      </Link>
                    </div>
                  )}
                </div>

                {/* File tab marker */}
                <div className="absolute -top-px left-7 w-20 h-0.5 bg-zinc-600 group-hover:bg-zinc-400 transition-colors" />
              </div>
            );
          })}
        </div>

        {/* Archive footer */}
        <div className="mt-16 pt-8 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-800">
            Archive sealed / Axis Systems {caseYear}
          </p>
          <Link
            href="/designs/claude"
            className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-700 hover:text-white transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>
    </main>
  );
}
