import Link from "next/link";

type ClaudeVariant = {
  num: number;
  name: string;
  description: string;
  feel: string;
  special?: true;
};

const variants: ClaudeVariant[] = [
  {
    num: 1,
    name: "The Cartographer",
    description:
      "Domains plotted at their real X/Y coordinates on a spatial map. Click nodes to enter. Faint coordinate grid.",
    feel: "Spatial. Data-driven. Quiet precision.",
  },
  {
    num: 2,
    name: "The Broadcast",
    description:
      "Each domain as an intercepted transmission. Header tape, display-scale name, body text, operational directive.",
    feel: "Signal. Sequential. High-contrast.",
  },
  {
    num: 3,
    name: "The Ledger",
    description:
      "Full-width brutalist table. No cards. Row hover inverts to white. Status encoded as ● ◐ ○.",
    feel: "Brutal. Flat. Accountable.",
  },
  {
    num: 4,
    name: "The Headline",
    description:
      "Dark newspaper front page. AXIS as masthead. Lead story takes 60% width. Two secondary stories stacked right.",
    feel: "Editorial. Broadsheet. Authoritative.",
  },
  {
    num: 5,
    name: "The Archive",
    description:
      "Stacked case files. Each domain has a case number, subject declaration, cost, and recommended action. Status as a rubber stamp.",
    feel: "Bureaucratic. Heavy. Sharp.",
  },
  {
    num: 6,
    name: "The Orrery",
    description:
      "CSS-animated solar system. AXIS as the sun. Three domains orbit as planets — real-time CSS keyframe rotation. No Three.js.",
    feel: "Cosmic. Kinetic. Sci-fi precision.",
    special: true,
  },
];

export default function ClaudeDesignsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-8 py-20">

        <div className="mb-14">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-zinc-600">
            Axis / Claude
          </p>
          <h1 className="text-3xl font-light tracking-tight text-white">
            Claude homepage variants
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">
            Six structurally distinct homepage interpretations. Each varies in
            layout, hierarchy, interaction model, and mood. Variant 6 is the
            special solar system concept.
          </p>
        </div>

        <div className="border-t border-zinc-900">
          {variants.map((variant: ClaudeVariant) => (
            <Link
              key={variant.num}
              href={`/designs/claude/${variant.num}`}
              className="group flex items-start gap-6 border-b border-zinc-900 py-8 transition-colors hover:border-zinc-700"
            >
              <span className="pt-1 text-xs font-mono text-zinc-700 shrink-0 w-6">
                {String(variant.num).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h2 className="text-lg font-light text-white transition-colors group-hover:text-zinc-200">
                    {variant.name}
                    {variant.special && (
                      <span className="ml-3 text-[10px] font-mono tracking-widest uppercase text-amber-400/70 align-middle">
                        special
                      </span>
                    )}
                  </h2>
                  <span className="text-sm text-zinc-700 transition-colors group-hover:text-zinc-500 shrink-0">
                    →
                  </span>
                </div>
                <p className="text-sm leading-6 text-zinc-500 mb-1">
                  {variant.description}
                </p>
                <p className="text-xs text-zinc-700 italic">{variant.feel}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex gap-6">
          <Link
            href="/designs"
            className="text-xs uppercase tracking-[0.3em] text-zinc-700 transition-colors hover:text-white"
          >
            ← All design lanes
          </Link>
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.3em] text-zinc-700 transition-colors hover:text-white"
          >
            Back to app
          </Link>
        </div>
      </div>
    </main>
  );
}
