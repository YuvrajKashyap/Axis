import { getDomains, type DomainListStatus } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const statusDot: Record<DomainListStatus, string> = {
  ALIGNED: "bg-white",
  NEUTRAL: "bg-amber-400",
  DRIFTING: "bg-red-400",
  ARCHIVED: "bg-zinc-600",
};

const statusGlow: Record<DomainListStatus, string> = {
  ALIGNED: "0 0 16px rgba(255,255,255,0.5), 0 0 32px rgba(255,255,255,0.15)",
  NEUTRAL: "0 0 16px rgba(251,191,36,0.5), 0 0 32px rgba(251,191,36,0.15)",
  DRIFTING: "0 0 16px rgba(248,113,113,0.4), 0 0 32px rgba(248,113,113,0.1)",
  ARCHIVED: "0 0 12px rgba(113,113,122,0.35), 0 0 24px rgba(113,113,122,0.08)",
};

const statusText: Record<DomainListStatus, string> = {
  ALIGNED: "text-zinc-400",
  NEUTRAL: "text-amber-400",
  DRIFTING: "text-red-400",
  ARCHIVED: "text-zinc-600",
};

// Design 1: The Cartographer
// Domain data includes positionX and positionY.
// This design renders them as actual coordinate-space nodes on a spatial map.
// The layout is genuinely different from any card or list pattern —
// it uses absolute positioning based on real data.

function toPercent(val: number): string {
  // Map coordinate range [-3, 3] to screen range [10%, 90%]
  const pct = 10 + ((val + 3) / 6) * 80;
  return `${Math.max(8, Math.min(92, pct))}%`;
}

export default async function Design1() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains = await getDomains(session.user.id);

  // Assign fallback positions by index if missing
  const fallbackX = [2, -1, 0];
  const fallbackY = [1, 2, -2];

  return (
    <main className="relative min-h-screen bg-black overflow-hidden text-white select-none">

      {/* Coordinate grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "10% 10%",
        }}
      />

      {/* Axes */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/[0.05] pointer-events-none" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-white/[0.05] pointer-events-none" />

      {/* Axis labels on coordinate lines */}
      <span className="absolute top-1/2 left-2 -translate-y-1/2 text-[9px] font-mono text-zinc-800 uppercase tracking-widest pointer-events-none">
        −x
      </span>
      <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[9px] font-mono text-zinc-800 uppercase tracking-widest pointer-events-none">
        +x
      </span>
      <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[9px] font-mono text-zinc-800 uppercase tracking-widest pointer-events-none">
        +y
      </span>
      <span className="absolute left-1/2 bottom-2 -translate-x-1/2 text-[9px] font-mono text-zinc-800 uppercase tracking-widest pointer-events-none">
        −y
      </span>

      {/* Center origin mark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
        <span className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-800 mt-1">
          AXIS
        </span>
      </div>

      {/* Domain nodes */}
      {domains.map((d, i) => {
        const px = d.positionX ?? fallbackX[i] ?? 0;
        const py = d.positionY ?? fallbackY[i] ?? 0;
        const status = d.status;

        // Flip Y so positive is "up" on screen
        const left = toPercent(px);
        const top = toPercent(-py);

        return (
          <Link
            key={d.id}
            href={`/domain/${d.slug}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left, top }}
          >
            {/* Hover area */}
            <div className="relative p-4">
              {/* Expanding ring on hover */}
              <div
                className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/10 scale-75 group-hover:scale-150 transition-all duration-500 pointer-events-none"
              />

              {/* Core dot */}
              <div
                className={`w-3 h-3 rounded-full ${statusDot[status]} transition-transform duration-300 group-hover:scale-150`}
                style={{ boxShadow: statusGlow[status] }}
              />
            </div>

            {/* Label — always visible */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none">
              <p className="text-sm font-light text-white group-hover:text-zinc-200 transition-colors">
                {d.name}
              </p>
              <p className={`text-[10px] font-mono uppercase tracking-widest ${statusText[status]} mt-0.5`}>
                {d.status}
              </p>
            </div>

            {/* Identity — fades in on hover */}
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none text-center">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {d.identity}
              </p>
            </div>
          </Link>
        );
      })}

      {/* UI chrome */}
      <div className="fixed top-8 left-8">
        <p className="text-[10px] font-mono tracking-[0.35em] uppercase text-zinc-700">
          Axis / Domain Map
        </p>
      </div>

      <div className="fixed top-8 right-8 text-right">
        <p className="text-[10px] font-mono tracking-[0.35em] uppercase text-zinc-800">
          {domains.length} domains plotted
        </p>
      </div>

      <div className="fixed bottom-8 left-8">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-widest text-zinc-800">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" /> Aligned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Neutral
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Drifting
          </span>
        </div>
      </div>

      <div className="fixed bottom-8 right-8">
        <Link
          href="/designs/claude"
          className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-800 hover:text-white transition-colors"
        >
          ← Back
        </Link>
      </div>
    </main>
  );
}
