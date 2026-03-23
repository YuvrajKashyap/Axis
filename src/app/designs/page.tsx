import Link from "next/link";

type DesignProvider = {
  slug: string;
  name: string;
  description: string;
};

const providers: DesignProvider[] = [
  {
    slug: "claude",
    name: "Claude",
    description: "Current homepage exploration set preserved as variants 1-5.",
  },
  {
    slug: "gemini",
    name: "Gemini",
    description: "Separate variant lane reserved for Gemini homepage explorations.",
  },
];

export default function DesignsIndex() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-8 py-20">
        <div className="mb-14">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-zinc-600">
            Axis / Design Comparison
          </p>
          <h1 className="text-3xl font-light tracking-tight text-white">
            Choose a design lane
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">
            Homepage exploration routes are split by provider so variants stay
            isolated and easy to compare.
          </p>
        </div>

        <div className="border-t border-zinc-900">
          {providers.map((provider: DesignProvider) => (
            <Link
              key={provider.slug}
              href={`/designs/${provider.slug}`}
              className="group flex items-start justify-between gap-6 border-b border-zinc-900 py-8 transition-colors hover:border-zinc-700"
            >
              <div>
                <p className="text-lg font-light text-white transition-colors group-hover:text-zinc-200">
                  {provider.name}
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  {provider.description}
                </p>
              </div>
              <span className="pt-1 text-sm text-zinc-700 transition-colors group-hover:text-zinc-500">
                →
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.3em] text-zinc-700 transition-colors hover:text-white"
          >
            ← Back to app
          </Link>
        </div>
      </div>
    </main>
  );
}
