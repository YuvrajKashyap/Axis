import { getDomains } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function GravityDesign() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains = await getDomains(session.user.id);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 flex flex-col items-center">
      <div className="w-full max-w-7xl px-8 py-32 flex flex-col items-center space-y-64">
        <header className="w-full flex justify-between items-start border-b border-zinc-900 pb-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-light tracking-tighter uppercase italic">Gravity</h1>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.5em]">System_Weight_Load: Balanced</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-800 uppercase tracking-widest leading-loose font-mono">
              X_COORD: 101.992<br />
              Y_COORD: 02.112
            </p>
          </div>
        </header>

        <div className="w-full flex flex-col items-center space-y-32">
          {domains.map((d) => (
            <Link
              key={d.id}
              href={`/domain/${d.slug}`}
              className="group w-full max-w-4xl flex flex-col items-center text-center space-y-8"
            >
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-zinc-800 font-mono tracking-widest mb-4 group-hover:text-zinc-500 transition-colors">
                  D_ID: {d.slug}
                </span>
                <h2 className="text-6xl md:text-9xl font-extralight tracking-tight uppercase transition-all duration-1000 group-hover:tracking-tighter group-hover:font-normal group-hover:italic group-hover:opacity-100 opacity-60">
                  {d.name}
                </h2>
                <div className="mt-8 h-px w-0 bg-white/20 group-hover:w-full transition-all duration-1000" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left w-full pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                <div className="space-y-4">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">The Reason</p>
                  <p className="text-sm font-light leading-relaxed text-zinc-400 italic">
                    &ldquo;{d.primaryReason}&rdquo;
                  </p>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">The Identity</p>
                  <p className="text-sm font-light leading-relaxed text-zinc-400 uppercase tracking-widest">{d.identity}</p>
                </div>
              </div>
              
              {/* Floating Status Indicator */}
              <div className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-64 transition-all duration-1000 pointer-events-none">
                <span className="text-[10px] text-zinc-200 border border-white/10 px-6 py-2 rounded-full uppercase tracking-widest bg-black">
                  Status: {d.status}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <footer className="w-full pt-32 text-center opacity-20 hover:opacity-100 transition-opacity cursor-default">
          <p className="text-[10px] text-zinc-400 uppercase tracking-[1em]">Axis // Gravity Protocol // Final_End</p>
        </footer>
      </div>
    </main>
  );
}
