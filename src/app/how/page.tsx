import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-200">
      {/* Header */}
      <header className="flex items-center justify-center pt-12 pb-4">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          AXIS
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        {/* Title */}
        <h1 className="font-[family-name:var(--font-playfair)] italic text-4xl md:text-5xl text-zinc-100 mb-4 text-center leading-tight">
          How it works
        </h1>
        <p className="text-center text-[11px] font-mono tracking-[0.3em] uppercase text-zinc-600 mb-20">
          A personal alignment system
        </p>

        {/* Sections */}
        <div className="space-y-20">
          {/* What is Axis */}
          <section>
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
              What is Axis
            </h2>
            <p className="text-zinc-400 leading-relaxed text-[15px]">
              Axis keeps you aligned with the things that matter to you.
              You define your domains. The areas of life you care about. They
              orbit around your center like planets in a solar system. The closer a
              planet is to the sun, the more aligned you are. Neglect it, and it drifts.
            </p>
          </section>

          {/* The Loop */}
          <section>
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
              The Loop
            </h2>
            <div className="space-y-6">
              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-16">Open</span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Look at your system. See which planets are close, which ones have drifted.
                  No judgment. Just awareness of where you stand.
                </p>
              </div>
              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-16">Align</span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Click Align to enter the reset flow. For each active domain, write one commitment.
                  The single next thing you will do. Not a wish. Not a plan. An action.
                </p>
              </div>
              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-16">Execute</span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Go do it. Come back when you&apos;re ready for the next one.
                </p>
              </div>
            </div>
          </section>

          {/* Domains */}
          <section>
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
              Domains
            </h2>
            <p className="text-zinc-400 leading-relaxed text-[15px] mb-4">
              Domains are the areas of your life you want to stay locked in on.
              Health, career, relationships, a side project. Whatever matters to you.
              Each one becomes a planet in your system.
            </p>
            <p className="text-zinc-400 leading-relaxed text-[15px]">
              Click into any planet to see its details, write commitments, set your
              identity for that domain, your vision, and your reason for pursuing it.
              You can change its color too.
            </p>
          </section>

          {/* Drift */}
          <section>
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
              Drift
            </h2>
            <p className="text-zinc-400 leading-relaxed text-[15px]">
              If you don&apos;t make a commitment in a domain for 72 hours, that planet
              automatically drifts out of orbit. Not a punishment. A signal.
              Make a new commitment and it comes back. The system reflects
              reality, not aspirations.
            </p>
          </section>

          {/* Archive */}
          <section>
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
              Archive
            </h2>
            <p className="text-zinc-400 leading-relaxed text-[15px]">
              Some domains need to be put on hold. Archiving a planet moves it to the
              outer edge. It won&apos;t drift automatically. It stays where you put it
              until you bring it back.
            </p>
          </section>

          {/* Philosophy */}
          <section>
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
              Philosophy
            </h2>
            <p className="text-zinc-400 leading-relaxed text-[15px]">
              No feeds. No notifications. No streaks. No gamification.
              Axis is not trying to make you addicted to self-improvement.
              Open it, look at it, close it, act on it.
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-24 text-center">
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 hover:text-zinc-300 transition-colors border-b border-dashed border-zinc-800 hover:border-zinc-500 pb-1"
          >
            Back to your system
          </Link>
        </div>
      </main>

      <aside className="fixed top-28 right-8 hidden xl:block w-72 z-20">
        <div className="relative overflow-hidden rounded-[28px] border border-zinc-900/80 bg-black/45 px-5 py-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(circle at top right, rgba(103,232,249,0.08) 0%, transparent 38%), radial-gradient(circle at bottom left, rgba(255,255,255,0.04) 0%, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-5 top-0 h-px"
            aria-hidden
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.16) 50%, transparent 100%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-500/70 shadow-[0_0_12px_rgba(255,255,255,0.18)]" />
              <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-600">
                TL;DR
              </p>
            </div>
          <p
            className="mt-4 text-[15px] leading-7 text-zinc-300"
            style={{
              fontFamily: "\"Century Schoolbook\", Georgia, serif",
            }}
          >
            I built this so I can lay out everything that needs my attention,
            keep it organized, and stop important parts of life from slipping
            away.
          </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
