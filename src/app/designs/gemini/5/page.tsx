import { getDomains, type DomainList, type DomainListItem } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AtmosphereDesign() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains: DomainList = await getDomains(session.user.id);

  return (
    <main className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-8 overflow-hidden selection:bg-white/20">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-zinc-900/30 blur-[120px] rounded-full" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-zinc-800/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-zinc-900/40 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-5xl space-y-48">
        <header className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <p className="text-[10px] uppercase tracking-[0.8em] text-zinc-600 font-light">Atmospheric Reset</p>
          <h1 className="text-4xl lg:text-5xl font-extralight tracking-[0.2em] italic">Soft_Clear</h1>
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
          {domains.map((domain: DomainListItem, index: number) => (
            <Link
              key={domain.id}
              href={`/domain/${domain.slug}`}
              className="group relative flex flex-col space-y-8 transition-all duration-700"
            >
              <div className="space-y-4">
                <span className="text-[10px] text-zinc-700 uppercase tracking-widest font-mono group-hover:text-zinc-400 transition-colors">Domain_0{index + 1}</span>
                <h2 className="text-2xl font-light tracking-[0.2em] uppercase group-hover:italic transition-all">
                  {domain.name}
                </h2>
              </div>
              
              <p className="text-sm text-zinc-500 leading-relaxed font-light tracking-wide group-hover:text-zinc-200 transition-colors duration-500">
                {domain.identity}
              </p>

              <div className="pt-8 flex items-center justify-between border-t border-zinc-900/50">
                <span className="text-[9px] text-zinc-600 uppercase tracking-[0.3em]">{domain.status}</span>
                <div className="h-1 w-1 rounded-full bg-zinc-800 group-hover:bg-white group-hover:scale-150 transition-all duration-700" />
              </div>

              {/* Hover Atmosphere Card Effect */}
              <div className="absolute -inset-8 bg-zinc-900/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl -z-10 transition-opacity duration-1000" />
            </Link>
          ))}
        </div>

        <footer className="text-center pt-24 opacity-30">
          <p className="text-[10px] uppercase tracking-[0.4em] font-light">Axis Archive // 2026</p>
        </footer>
      </div>
    </main>
  );
}
