"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitResetCommitments } from "./actions";

type ResetDomain = {
  id: string;
  name: string;
  slug: string;
  identity: string | null;
  nextMove: string | null;
  color: string | null;
};

type ResetCommitmentEntry = {
  domainId: string;
  text: string;
};

export function ResetFlow({ domains }: { domains: ResetDomain[] }) {
  const [step, setStep] = useState(0);
  const [commitments, setCommitments] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const total = domains.length;

  if (total === 0) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400 text-sm">No active domains to reset.</p>
          <Link
            href="/"
            className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-600 border border-zinc-800 rounded-full px-5 py-2 transition hover:border-zinc-600 hover:text-zinc-400"
          >
            ← Back to Axis
          </Link>
        </div>
      </main>
    );
  }

  // Summary view after all commitments entered
  if (done) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center space-y-2">
            <p className="text-[11px] font-mono tracking-[0.5em] uppercase text-zinc-500">
              Alignment locked
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {total} commitment{total !== 1 ? "s" : ""} set.
            </h1>
          </div>

          <div className="space-y-3">
            {domains.map((domain: ResetDomain) => {
              const text = commitments[domain.id];
              if (!text) return null;
              return (
                <div
                  key={domain.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4"
                >
                  <p className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2"
                    style={{ color: domain.color ?? "#67e8f9" }}
                  >
                    {domain.name}
                  </p>
                  <p className="text-sm text-zinc-200">{text}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-zinc-400 mb-6">Now execute. No negotiation.</p>
            <Link
              href="/"
              className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 border border-zinc-800 rounded-full px-6 py-2.5 transition hover:border-zinc-600 hover:text-zinc-300"
            >
              Back to Axis
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const current = domains[step];
  const currentText = commitments[current.id] ?? "";
  const isLast = step === total - 1;

  function handleNext() {
    if (isLast) {
      // Submit all commitments
      const entries: ResetCommitmentEntry[] = Object.entries(commitments)
        .filter(([, value]: [string, string]) => value.trim())
        .map(([domainId, text]: [string, string]) => ({
          domainId,
          text: text.trim(),
        }));

      startTransition(async () => {
        await submitResetCommitments(entries);
        setDone(true);
      });
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleSkip() {
    // Remove commitment for this domain if any, move to next
    setCommitments((prev) => {
      const next = { ...prev };
      delete next[current.id];
      return next;
    });

    if (isLast) {
      const entries: ResetCommitmentEntry[] = Object.entries(commitments)
        .filter(
          ([domainId, text]: [string, string]) =>
            domainId !== current.id && text.trim(),
        )
        .map(([domainId, text]: [string, string]) => ({
          domainId,
          text: text.trim(),
        }));

      startTransition(async () => {
        if (entries.length > 0) {
          await submitResetCommitments(entries);
        }
        setDone(true);
      });
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Progress */}
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-700 transition hover:text-zinc-400"
          >
            ← Exit
          </Link>
          <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-600">
            {step + 1} / {total}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-px bg-zinc-900 mb-12 relative">
          <div
            className="h-px transition-all duration-500"
            style={{
              width: `${((step + 1) / total) * 100}%`,
              backgroundColor: current.color ?? "#67e8f9",
              opacity: 0.6,
            }}
          />
        </div>

        {/* Domain info */}
        <div className="space-y-3 mb-10">
          <p
            className="text-[10px] font-mono tracking-[0.3em] uppercase"
            style={{ color: current.color ?? "#67e8f9" }}
          >
            {current.name}
          </p>

          {current.identity && (
            <p className="text-xs text-zinc-500 leading-relaxed">
              {current.identity}
            </p>
          )}

          {current.nextMove && (
            <p className="text-sm text-zinc-300 leading-relaxed">
              Next move: {current.nextMove}
            </p>
          )}
        </div>

        {/* Commitment input */}
        <div className="space-y-4">
          <label className="text-sm text-zinc-300 block">
            Today I will:
          </label>
          <input
            type="text"
            value={currentText}
            onChange={(e) =>
              setCommitments((prev) => ({ ...prev, [current.id]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && currentText.trim()) handleNext();
            }}
            placeholder="Enter your commitment..."
            autoFocus
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handleSkip}
            disabled={isPending}
            className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600 transition hover:text-zinc-400 disabled:opacity-40"
          >
            Skip
          </button>

          <div className="flex items-center gap-4">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600 transition hover:text-zinc-400"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isPending || !currentText.trim()}
              className="text-[10px] font-mono tracking-[0.3em] uppercase border border-zinc-700 rounded-full px-5 py-2 text-white transition hover:border-zinc-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isPending ? "Saving…" : isLast ? "Lock in" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
