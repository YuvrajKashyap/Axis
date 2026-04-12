import { getDomains, type DomainList, type DomainListItem } from "@/lib/get-data";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import Link from "next/link";

export default async function StellarStripDesign() {
  const user = await requireSupabaseUser();
  const domains: DomainList = await getDomains(user.id);

  return (
    <main className="min-h-screen bg-black text-white flex overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Cinematic Content Area */}
      <div className="flex-1 relative flex items-center p-24">
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/50 to-transparent z-10" />
        <div className="max-w-2xl relative z-20 space-y-12">
          <header className="space-y-4">
            <h1 className="text-sm uppercase tracking-[0.5em] text-zinc-600 font-medium">Domain Briefing</h1>
            <p className="text-4xl lg:text-5xl font-extralight tracking-tight leading-tight text-zinc-300">
              Clear the noise.<br />Find the <span className="text-white font-normal italic">Axis.</span>
            </p>
          </header>
          
          <div className="space-y-4 border-l border-zinc-900 pl-8">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-loose">
              Selected Configuration: Standard Alignment<br />
              Status: Calibration_Required<br />
              Epoch: 2026.03.21
            </p>
          </div>
        </div>
      </div>

      {/* Vertical Navigation Strip */}
      <div className="w-96 border-l border-zinc-900 bg-[#020202] flex flex-col p-8 space-y-16">
        <header className="mb-8">
          <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-tighter">NAV_MATRIX</h2>
        </header>

        <div className="flex-1 flex flex-col justify-center space-y-1">
          {domains.map((domain: DomainListItem, index: number) => (
            <Link
              key={domain.id}
              href={`/domain/${domain.slug}`}
              className="group py-8 px-6 border border-transparent hover:border-zinc-800 hover:bg-zinc-900/20 transition-all duration-500 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-zinc-500 font-mono">0{index + 1}</span>
                <span className="text-[9px] text-zinc-700 uppercase tracking-widest">{domain.status}</span>
              </div>
              <h3 className="text-lg font-light tracking-[0.2em] uppercase group-hover:text-white transition-colors group-hover:translate-x-2 duration-700">
                {domain.name}
              </h3>
              <p className="mt-4 text-[10px] text-zinc-600 uppercase tracking-widest line-clamp-1 group-hover:text-zinc-400 transition-colors">
                {domain.description}
              </p>
            </Link>
          ))}
        </div>

        <footer className="pt-12 border-t border-zinc-900">
          <p className="text-[10px] text-zinc-800 uppercase tracking-widest text-center">
            SYSTEM VERSION: 2.1.0-STABLE
          </p>
        </footer>
      </div>
    </main>
  );
}
