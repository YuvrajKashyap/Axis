import { getDomains, type DomainList, type DomainListItem } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EclipseDesign() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains: DomainList = await getDomains(session.user.id);

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 overflow-hidden font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,#111_0%,transparent_60%)]" />
      
      <div className="relative z-10 w-full max-w-4xl">
        <header className="mb-24 text-center">
          <h1 className="text-xs uppercase tracking-[0.8em] text-zinc-600 mb-4">Alignment Protocol</h1>
          <div className="h-px w-24 bg-zinc-800 mx-auto" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {domains.map((domain: DomainListItem, index: number) => (
            <Link
              key={domain.id}
              href={`/domain/${domain.slug}`}
              className="group relative flex flex-col items-center text-center"
            >
              {/* The "Eclipse" Circle */}
              <div className="relative h-48 w-48 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-zinc-900 group-hover:border-white/20 transition-all duration-700" />
                <div className="absolute inset-2 rounded-full bg-black z-10 transition-transform duration-700 group-hover:scale-95" />
                {/* The "Corona" Glow */}
                <div className="absolute inset-0 rounded-full bg-white/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 scale-110" />
                <span className="relative z-20 text-[10px] text-zinc-700 font-mono tracking-widest group-hover:text-zinc-400 transition-colors">
                  0{index + 1}
                </span>
              </div>

              <h2 className="text-xl font-light tracking-[0.2em] uppercase mb-4 group-hover:tracking-[0.4em] transition-all duration-700">
                {domain.name}
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-700 max-w-[180px]">
                {domain.identity}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <footer className="fixed bottom-12 left-12">
        <p className="text-[10px] text-zinc-800 uppercase tracking-[0.4em]">Axis // Eclipse_Mode</p>
      </footer>
    </main>
  );
}
