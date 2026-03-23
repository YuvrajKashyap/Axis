import Link from 'next/link';

type GeminiDesign = {
  id: number;
  name: string;
  desc: string;
};

const designs: GeminiDesign[] = [
  { id: 1, name: "Eclipse", desc: "Circular alignment and corona glows." },
  { id: 2, name: "Stellar Strip", desc: "Vertical strip with cinematic briefing." },
  { id: 3, name: "Gravity", desc: "Weight-based typographic hierarchy." },
  { id: 4, name: "Vector", desc: "Systemic connections and sharp lines." },
  { id: 5, name: "Atmosphere", desc: "Mood-focused with soft gradients." },
  { id: 6, name: "Solar System", desc: "CSS orbital protocol with planetary domains." },
];

export default function GeminiIndex() {
  return (
    <div className="min-h-screen bg-black text-white p-12 lg:p-24 font-sans">
      <div className="max-w-xl space-y-16">
        <header className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-600">Series: Gemini</p>
          <h1 className="text-3xl font-light tracking-tight">6 Strategic Directions</h1>
          <p className="text-sm text-zinc-500 leading-relaxed uppercase tracking-widest">
            A comprehensive exploration of the Axis core reset protocol. Grounded in real data.
          </p>
        </header>

        <div className="space-y-8">
          {designs.map((design: GeminiDesign) => (
            <Link 
              key={design.id} 
              href={`/designs/gemini/${design.id}`}
              className="group block border-l border-zinc-900 pl-8 hover:border-white transition-all duration-500 py-4"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-light tracking-widest uppercase group-hover:translate-x-4 transition-transform duration-700">
                  {design.name}
                </h2>
                <span className="text-[10px] text-zinc-800 group-hover:text-zinc-500 font-mono transition-colors">0{design.id}</span>
              </div>
              <p className="mt-4 text-[10px] text-zinc-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                {design.desc}
              </p>
            </Link>
          ))}
        </div>

        <footer className="pt-24">
          <Link href="/" className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] hover:text-white transition-colors">
            ← Return to Core
          </Link>
        </footer>
      </div>
    </div>
  );
}
