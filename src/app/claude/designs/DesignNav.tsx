"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const designs = [
  { n: 1, label: "Monolith" },
  { n: 2, label: "Dossier" },
  { n: 3, label: "Terminal" },
  { n: 4, label: "Cinematic" },
  { n: 5, label: "Grid" },
  { n: 6, label: "Tactical" },
];

export function DesignNav() {
  const pathname = usePathname();
  const current = pathname.split("/").pop();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-600 transition-colors hover:text-zinc-300"
        >
          ← Axis
        </Link>
        <div className="flex items-center gap-1">
          {designs.map((d) => {
            const active = current === String(d.n);
            return (
              <Link
                key={d.n}
                href={`/claude/designs/${d.n}`}
                className={`rounded-md px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.2em] transition-all ${
                  active
                    ? "bg-white/[0.08] text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {d.n}
              </Link>
            );
          })}
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-700">
          Settings explorations
        </span>
      </div>
    </div>
  );
}
