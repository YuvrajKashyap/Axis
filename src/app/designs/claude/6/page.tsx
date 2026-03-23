import {
  getDomains,
  type DomainList,
  type DomainListItem,
  type DomainListStatus,
} from "@/lib/get-data";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import "./orrery.css";

// Design 6: The Orrery
// A 2D CSS solar system. AXIS is the sun. Domains orbit as planets.
// Planets animate along elliptical CSS orbits using the arm-rotation technique:
//   — Each planet is at the end of an invisible "arm" div
//   — The arm rotates around its left origin (the solar center)
//   — The planet label counter-rotates to stay upright
// No Three.js. No canvas. Pure CSS keyframes + inline transforms.
// Status encodes into planet color and glow intensity.
// Clicking a planet navigates to the domain.
// Aesthetic: high-end sci-fi interface. Sparse. Precise. Luminous.

type OrbitalConfig = {
  radius: number;       // px, arm length = orbit radius
  armClass: string;     // CSS animation class for the arm
  counterClass: string; // CSS animation class for counter-rotation
  ringClass: string;    // CSS animation class for the orbit ring
};

const ORBITS: OrbitalConfig[] = [
  { radius: 100, armClass: "orbit-arm-alpha", counterClass: "counter-alpha", ringClass: "ring-alpha" },
  { radius: 170, armClass: "orbit-arm-beta",  counterClass: "counter-beta",  ringClass: "ring-beta"  },
  { radius: 248, armClass: "orbit-arm-gamma", counterClass: "counter-gamma", ringClass: "ring-gamma" },
];

const STATUS_PLANET: Record<DomainListStatus, { color: string; glow: string; ringColor: string; dotSize: number }> = {
  ALIGNED: {
    color: "#ffffff",
    glow: "0 0 12px rgba(255,255,255,0.8), 0 0 28px rgba(255,255,255,0.4), 0 0 56px rgba(255,255,255,0.1)",
    ringColor: "rgba(255,255,255,0.12)",
    dotSize: 10,
  },
  NEUTRAL: {
    color: "#fbbf24",
    glow: "0 0 12px rgba(251,191,36,0.8), 0 0 28px rgba(251,191,36,0.4), 0 0 56px rgba(251,191,36,0.1)",
    ringColor: "rgba(251,191,36,0.10)",
    dotSize: 9,
  },
  DRIFTING: {
    color: "#f87171",
    glow: "0 0 10px rgba(248,113,113,0.6), 0 0 24px rgba(248,113,113,0.25)",
    ringColor: "rgba(248,113,113,0.08)",
    dotSize: 8,
  },
  ARCHIVED: {
    color: "#71717a",
    glow: "0 0 8px rgba(113,113,122,0.5), 0 0 18px rgba(113,113,122,0.2)",
    ringColor: "rgba(113,113,122,0.08)",
    dotSize: 7,
  },
};

// Container dimensions — the orrery lives inside this box
const SIZE = 600; // px square container
const CENTER = SIZE / 2;

export default async function Design6() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const domains: DomainList = await getDomains(session.user.id);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">

      {/* Corner labels */}
      <div className="fixed top-8 left-8 z-10">
        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-800">
          Axis / Domain Orrery
        </p>
      </div>
      <div className="fixed top-8 right-8 z-10 text-right">
        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-800">
          {domains.length} bodies in orbit
        </p>
      </div>

      {/* Main orrery — centered on screen */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">

        {/* Fixed-size container; scaled on smaller screens via CSS */}
        <div
          className="relative"
          style={{
            width: SIZE,
            height: SIZE,
            maxWidth: "min(600px, calc(100vw - 2rem))",
            aspectRatio: "1",
          }}
        >
          {/* Orbit rings */}
          {ORBITS.map((orb, i) => {
            const diameter = orb.radius * 2;
            const domain: DomainListItem | undefined = domains[i];
            if (!domain) return null;
            const status = domain.status;
            const cfg = STATUS_PLANET[status];

            return (
              <div
                key={`ring-${i}`}
                className={`absolute rounded-full border ${orb.ringClass}`}
                style={{
                  width: diameter,
                  height: diameter,
                  top: CENTER - orb.radius,
                  left: CENTER - orb.radius,
                  borderColor: cfg.ringColor,
                }}
              />
            );
          })}

          {/* Sun — AXIS core */}
          <div
            className="absolute flex flex-col items-center"
            style={{
              top: CENTER,
              left: CENTER,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Outer glow halo */}
            <div
              className="absolute w-10 h-10 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
                width: 56,
                height: 56,
                marginLeft: -28,
                marginTop: -28,
              }}
            />
            {/* Core dot */}
            <div
              className="sun-core w-3 h-3 rounded-full bg-white"
              style={{
                boxShadow: "0 0 10px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.4), 0 0 48px rgba(255,255,255,0.15)",
              }}
            />
            <span
              className="text-[9px] font-mono tracking-[0.5em] uppercase text-zinc-600 mt-3 whitespace-nowrap"
            >
              AXIS
            </span>
          </div>

          {/* Planets — orbit arm technique */}
          {ORBITS.map((orb, i) => {
            const domain: DomainListItem | undefined = domains[i];
            if (!domain) return null;

            const status = domain.status;
            const cfg = STATUS_PLANET[status];
            const dotSize = cfg.dotSize;

            return (
              // Orbit arm — originates at center, extends right by radius px
              // Rotation origin is the left edge (= system center)
              <div
                key={`arm-${domain.id}`}
                className={`absolute ${orb.armClass}`}
                style={{
                  top: CENTER,
                  left: CENTER,
                  width: orb.radius,
                  height: 0,
                  transformOrigin: "0px 0px",
                }}
              >
                {/* Planet at the end of the arm */}
                <div
                  className={`absolute ${orb.counterClass}`}
                  style={{
                    right: -(dotSize / 2),
                    top: -(dotSize / 2),
                    width: dotSize,
                    height: dotSize,
                    transformOrigin: "center center",
                  }}
                >
                  <Link
                    href={`/domain/${domain.slug}`}
                    className="group absolute"
                    style={{
                      top: -(dotSize / 2),
                      left: -(dotSize / 2),
                      padding: 20,
                    }}
                  >
                    {/* Planet dot */}
                    <div
                      className="planet-dot rounded-full"
                      style={{
                        width: dotSize,
                        height: dotSize,
                        backgroundColor: cfg.color,
                        boxShadow: cfg.glow,
                        position: "relative",
                      }}
                    />

                    {/* Planet label — appears below the dot */}
                    <div
                      className="absolute whitespace-nowrap pointer-events-none"
                      style={{ top: dotSize + 8, left: "50%", transform: "translateX(-50%)" }}
                    >
                      <p
                        className="text-[10px] font-mono tracking-[0.25em] uppercase text-zinc-400 text-center group-hover:text-white transition-colors"
                      >
                        {domain.name}
                      </p>
                      <p
                        className="text-[8px] font-mono tracking-widest uppercase text-center mt-0.5"
                        style={{ color: cfg.color, opacity: 0.6 }}
                      >
                        {domain.status}
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Domain list below the system — for accessibility + usability */}
        <div className="mt-16 w-full max-w-sm">
          <div className="border-t border-zinc-900">
            {domains.map((domain: DomainListItem) => {
              const status = domain.status;
              const cfg = STATUS_PLANET[status];

              return (
                <Link
                  key={domain.id}
                  href={`/domain/${domain.slug}`}
                  className="group flex items-center justify-between border-b border-zinc-900 py-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.color, boxShadow: cfg.glow }}
                    />
                    <span className="text-sm font-light text-zinc-400 group-hover:text-white transition-colors">
                      {domain.name}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-mono tracking-widest uppercase"
                    style={{ color: cfg.color, opacity: 0.7 }}
                  >
                    {domain.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="fixed bottom-8 right-8 z-10">
        <Link
          href="/designs/claude"
          className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-800 hover:text-white transition-colors"
        >
          ← Back
        </Link>
      </div>
    </main>
  );
}
