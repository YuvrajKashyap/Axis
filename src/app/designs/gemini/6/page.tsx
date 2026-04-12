import { getDomains, type DomainList, type DomainListItem } from "@/lib/get-data";
import { requireSupabaseUser } from "@/lib/supabase-auth";
import Link from "next/link";

export default async function SolarSystemDesign() {
  const user = await requireSupabaseUser();
  const domains: DomainList = await getDomains(user.id);

  return (
    <main className="min-h-screen bg-black text-white font-sans overflow-hidden flex items-center justify-center relative">
      {/* Star Field Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 h-px w-px bg-white" />
        <div className="absolute top-3/4 left-2/3 h-px w-px bg-white" />
        <div className="absolute top-1/2 left-1/10 h-px w-px bg-white" />
        <div className="absolute top-1/10 left-1/2 h-px w-px bg-white" />
      </div>

      {/* The Core (Sun) */}
      <div className="relative z-20 flex flex-col items-center">
        <div className="h-32 w-32 rounded-full bg-white shadow-[0_0_80px_rgba(255,255,255,0.1)] flex items-center justify-center p-4 text-center">
          <p className="text-black text-[10px] uppercase tracking-[0.3em] font-bold leading-tight">
            CORE<br />RESET
          </p>
        </div>
        <div className="absolute top-full mt-8 text-center w-64 animate-pulse">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.5em]">Central Calibration</p>
        </div>
      </div>

      {/* Orbital Planes */}
      {domains.map((domain: DomainListItem, index: number) => {
        // Different orbit sizes and speeds
        const size = (index + 1) * 200 + 100;
        const speed = 20 + index * 10;
        const planetSize = 80 - index * 10;
        const delay = -index * 5;

        return (
          <div
            key={domain.id}
            className="absolute border border-zinc-900 rounded-full pointer-events-none transition-colors hover:border-zinc-700 animate-[spin_linear_infinite]"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              animationDuration: `${speed}s`,
              animationDelay: `${delay}s`,
            }}
          >
            {/* The Planet (Domain Card) */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto group animate-[spin-reverse_linear_infinite]"
              style={{
                // Prevent the card from spinning itself (counter-rotation)
                animationDuration: `${speed}s`,
                animationDelay: `${delay}s`,
              }}
            >
              <Link
                href={`/domain/${domain.slug}`}
                className="block relative p-4 rounded-full border border-zinc-800 bg-black hover:bg-zinc-950 transition-all duration-500 hover:scale-110 group-hover:border-white/20"
                style={{
                  width: `${planetSize * 2}px`,
                  height: `${planetSize * 2}px`,
                }}
              >
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-2">
                  <span className="text-[8px] text-zinc-700 uppercase tracking-tighter mb-1 font-mono">
                    MOD_{index + 1}
                  </span>
                  <h3 className="text-[10px] font-light uppercase tracking-widest text-zinc-300 group-hover:text-white group-hover:tracking-[0.2em] transition-all">
                    {domain.name}
                  </h3>
                  
                  {/* Floating Identity Info on Hover */}
                  <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none">
                    <p className="text-[9px] text-zinc-500 uppercase leading-relaxed tracking-widest">
                      {domain.identity}
                    </p>
                    <div className="mt-2 text-[8px] text-zinc-800 uppercase tracking-widest">
                      Status: {domain.status}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        );
      })}

      {/* Footer Branding */}
      <footer className="fixed bottom-12 right-12 text-right">
        <p className="text-[10px] text-zinc-800 uppercase tracking-[0.5em] leading-loose">
          Axis Systems<br />Solar_Protocol_v2
        </p>
      </footer>
    </main>
  );
}
