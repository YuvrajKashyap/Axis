"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/lib/auth-actions";

function SuccessCheck() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-emerald-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.4 2.4 4.6-5.4" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const inputClass =
    "w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-600 outline-none px-4 py-3 text-sm text-zinc-200 rounded-lg transition-colors font-mono placeholder:text-zinc-700";
  const labelClass =
    "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-400 mb-2";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setMessage("");

    startTransition(async () => {
      try {
        const result = await requestPasswordReset(email);
        if (result.success) {
          setSuccess(true);
          setMessage(
            result.message ||
              "If an account exists with Axis, you will get an email with the reset password link.",
          );
        } else {
          setError(result.error || "Something went wrong.");
        }
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black text-zinc-200">
      <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-800/10 blur-3xl" />

      <header className="absolute top-10 left-1/2 -translate-x-1/2">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-400 transition-colors hover:text-zinc-300"
        >
          AXIS
        </Link>
      </header>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/80 p-8 backdrop-blur-sm md:p-10">
          <h2 className="mb-1 font-[family-name:var(--font-playfair)] text-2xl italic text-zinc-100">
            Forgot your password?
          </h2>
          <p className="mb-8 text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-500">
            Enter your email to get a reset link
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@email.com"
                required
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs font-mono text-red-400/80">{error}</p>
            )}

            {success && (
              <div className="flex items-start gap-2 text-emerald-400">
                <div className="mt-px">
                  <SuccessCheck />
                </div>
                <p className="text-xs font-mono leading-5 text-emerald-400">
                  {message}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-lg bg-white py-3 text-[11px] font-mono tracking-[0.3em] uppercase text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
            >
              {isPending ? "Sending..." : "Send Link"}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login?mode=login"
                className="text-[10px] font-mono tracking-[0.18em] uppercase text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
