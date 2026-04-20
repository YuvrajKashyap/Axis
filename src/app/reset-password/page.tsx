"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PENDING_PASSWORD_KEY = "axis-password-reset-pending";

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
      {visible ? null : <path d="M4 4 20 20" />}
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    sessionStorage.removeItem(PENDING_PASSWORD_KEY);
  }, []);

  const inputClass =
    "w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-600 outline-none px-4 py-3 text-sm text-zinc-200 rounded-lg transition-colors font-mono placeholder:text-zinc-700";
  const labelClass =
    "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-400 mb-2";
  const passwordInputClass = `${inputClass} pr-14`;
  const eyeButtonClass =
    "absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500 transition-colors hover:text-zinc-300";

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    sessionStorage.setItem(PENDING_PASSWORD_KEY, password);
    router.push("/reset-password/confirm");
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
            Reset your password
          </h2>
          <p className="mb-8 text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-500">
            Step 1 of 2 - choose a new password
          </p>

          <form onSubmit={handleContinue} className="space-y-4">
            <div>
              <label className={labelClass}>New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={passwordInputClass}
                  placeholder="6+ characters"
                  required
                  minLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className={eyeButtonClass}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs font-mono text-red-400/80">{error}</p>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-white py-3 text-[11px] font-mono tracking-[0.3em] uppercase text-black transition-colors hover:bg-zinc-200"
            >
              Continue
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
