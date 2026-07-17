import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Axis turns life domains, drift, and concrete commitments into a short alignment loop.",
  alternates: {
    canonical: "/how",
  },
  openGraph: {
    url: "/how",
    title: "How Axis works",
    description:
      "A spatial personal alignment system built around Open, Align, and Execute.",
    images: [
      {
        url: "/showcase/how-it-works.png",
        width: 1234,
        height: 712,
        alt: "The Axis how-it-works page",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How Axis works",
    description:
      "A spatial personal alignment system built around Open, Align, and Execute.",
    images: ["/showcase/how-it-works.png"],
  },
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-200">
      {/* Header */}
      <header className="flex items-center justify-center pt-12 pb-4">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          AXIS
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        {/* Title */}
        <h1 className="font-[family-name:var(--font-playfair)] italic text-4xl md:text-5xl text-zinc-100 mb-4 text-center leading-tight">
          How it works
        </h1>
        <p className="text-center text-[11px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-20">
          A personal alignment system
        </p>

        {/* Sections */}
        <div className="space-y-20">
          {/* What is Axis */}
          <section>
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-400 mb-4">
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
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-400 mb-4">
              The Loop
            </h2>
            <div className="space-y-6">
              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-500 mt-1 shrink-0 w-16">Open</span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Look at your system. See which planets are close, which ones have drifted.
                  No judgment. Just awareness of where you stand.
                </p>
              </div>
              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-500 mt-1 shrink-0 w-16">Align</span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Click Align to move through your active domains one by one.
                  For each one, lock in the single next thing you will do.
                  Not a wish. Not a plan. An action.
                </p>
              </div>
              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-500 mt-1 shrink-0 w-16">Execute</span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Go do it. Come back when you&apos;re ready for the next one.
                </p>
              </div>
            </div>
          </section>

          {/* How to Use Axis */}
          <section>
            <h2 className="font-mono text-[11px] tracking-[0.4em] uppercase text-zinc-400 mb-4">
              How to use Axis
            </h2>
            <p className="text-zinc-400 leading-relaxed text-[15px] mb-10">
              If you are new, do not try to map your whole life perfectly on day one.
              Create a few domains that actually matter right now, fill them in honestly,
              make one real commitment, then return to the orrery. Axis works best when it
              gets you back into action quickly.
            </p>

            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-20">
                  Start
                </span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  After signing in, create a few planets for the areas of life that matter most.
                  Keep it focused. Health, work, relationships, a craft, a business, whatever is
                  actually alive in your life. Then click into each one and write the identity,
                  vision, reason, and cost so the planet means something when you return to it later.
                </p>
              </div>

              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-20">
                  Orrery
                </span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  The homepage is your live map. Every planet is a domain. Active planets stay in orbit.
                  Drifting planets move outward when they have gone stale. Archived planets are set aside on purpose.
                  What feels close, bright, and present is what is alive in the system. Drift is not a punishment.
                  It is the app showing you what has not been touched recently.
                </p>
              </div>

              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-20">
                  Domain
                </span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  When you click a planet, use that page to reconnect with direction. Review who you are in that
                  domain, what success looks like, why it matters, and what neglect costs. Then make one concrete
                  commitment. The point is to leave with clarity, not to sit there polishing language forever.
                </p>
              </div>

              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-20">
                  Align
                </span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Align is a guided reset. It walks through your active domains one by one and asks for the next move
                  in each area. You are not writing goals for the quarter. You are reorienting the system and locking
                  in a real next action for what is currently in orbit.
                </p>
              </div>

              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-20">
                  Rhythm
                </span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Use Axis when you feel off track, when something important is starting to slip, or when you need
                  to refresh commitments across the system. Open it, realign, close it, act. It is supposed to shorten
                  time-to-action, not become a place to linger.
                </p>
              </div>

              <div className="rounded-[26px] border border-zinc-900/90 bg-zinc-950/35 px-5 py-8">
                <div className="mb-[3.75rem] flex items-center justify-center gap-3 text-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-500/70 shadow-[0_0_12px_rgba(255,255,255,0.12)]" />
                  <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-zinc-600">
                    What to write
                  </p>
                </div>

                <div className="mx-auto max-w-[36rem] space-y-[3.75rem]">
                  <div className="text-center">
                    <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-zinc-500 mb-2">
                      Vision
                    </p>
                    <p className="text-zinc-400 leading-relaxed text-[14px]">
                      What success looks like when this part of life is actually working.
                    </p>
                  </div>

                  <div className="grid gap-12 sm:grid-cols-2">
                    <div className="text-center">
                      <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-zinc-500 mb-2">
                        Reason
                      </p>
                      <p className="text-zinc-400 leading-relaxed text-[14px]">
                        Why this domain matters to you. Keep it personal and real.
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-zinc-500 mb-2">
                        Cost
                      </p>
                      <p className="text-zinc-400 leading-relaxed text-[14px]">
                        What happens if you neglect it. This should create honesty, not drama.
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-zinc-500 mb-2">
                      Commitment
                    </p>
                    <p className="text-zinc-400 leading-relaxed text-[14px]">
                      The next concrete action. Something you can actually do, not a vague intention.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-20">
                  Settings
                </span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Every planet now has its own settings. You can change drift timing, commitment behavior,
                  orbit speed, visual intensity, size, and orbit shape. Leave them alone and the product behaves
                  exactly like the default Axis system. Change them only when a domain needs a different rule.
                </p>
              </div>

              <div className="flex gap-6 items-start">
                <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-zinc-600 mt-1 shrink-0 w-20">
                  Mindset
                </span>
                <p className="text-zinc-400 leading-relaxed text-[15px]">
                  Axis is not a task manager, habit tracker, or productivity game. There are no feeds, no streaks,
                  and no dopamine loops to farm. It is a personal alignment system. Use it to see reality, set direction,
                  and get back to work.
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
              By default, planets drift after 72 hours without commitment.
              You can change that per planet in Settings. Not a punishment.
              A signal. Make a new commitment and it comes back. The system
              reflects reality, not aspirations.
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
