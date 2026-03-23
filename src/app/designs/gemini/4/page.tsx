import { getDomains } from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function VectorDesign() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains = await getDomains(session.user.id);

  return (
    <main className="min-h-screen bg-[#020202] text-zinc-300 font-mono text-[10px] overflow-hidden selection:bg-zinc-800 selection:text-white antialiased">
      {/* Dynamic Background Lines */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/2 w-px h-full bg-zinc-800" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-zinc-800" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,#111_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 p-12 lg:p-24 flex flex-col justify-between min-h-screen">
        <header className="flex justify-between items-start">
          <div className="space-y-4">
            <h1 className="text-xl tracking-tighter text-white font-normal uppercase">Vector_Matrix</h1>
            <p className="text-zinc-600 uppercase tracking-widest">Sys_Status: [ONLINE]</p>
          </div>
          <div className="text-right space-y-4 border-t border-zinc-900 pt-4">
            <p className="text-zinc-500 uppercase">Axis_v2.1</p>
            <p className="text-zinc-700 uppercase tracking-widest">Deployment: Real_Code</p>
          </div>
        </header>

        <div className="flex flex-col space-y-24 max-w-lg">
          {domains.map((d, i) => (
            <Link
              key={d.id}
              href={`/domain/${d.slug}`}
              className="group flex items-start gap-12 group"
            >
              <div className="flex flex-col items-center pt-1">
                <div className="h-2 w-2 rounded-full border border-zinc-700 group-hover:bg-white group-hover:border-white transition-all duration-500" />
                <div className="h-32 w-px bg-zinc-900 group-hover:bg-zinc-500 transition-all duration-700" />
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-zinc-700">0{i + 1}</span>
                  <h2 className="text-lg text-white uppercase tracking-widest group-hover:translate-x-4 transition-transform duration-700">
                    {d.name}
                  </h2>
                </div>
                
                <p className="text-zinc-600 group-hover:text-zinc-300 transition-colors leading-relaxed uppercase tracking-widest max-w-[280px]">
                  {d.identity}
                </p>

                <div className="flex items-center gap-8 text-zinc-800 group-hover:text-zinc-600 transition-colors uppercase">
                  <span>[ {d.status} ]</span>
                  <span>[ {d.slug} ]</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <footer className="flex justify-between items-end">
          <div className="flex gap-12 text-zinc-700 uppercase tracking-widest">
            <p>Lat: 34.05</p>
            <p>Lon: -118.24</p>
            <p>Alt: 240m</p>
          </div>
          <div className="h-12 w-48 border border-zinc-900 flex items-center justify-center p-2 opacity-30 hover:opacity-100 transition-opacity">
            <div className="w-full h-1 bg-zinc-900">
              <div className="w-1/3 h-full bg-zinc-500" />
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
