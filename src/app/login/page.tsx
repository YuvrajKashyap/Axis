"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signup, login } from "@/lib/auth-actions";

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

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"signup" | "login">(() => {
    if (typeof window === "undefined") {
      return "signup";
    }

    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("mode") === "login" ? "login" : "signup";
  });

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] =
    useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupMessage, setSignupMessage] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupMessage("");

    if (signupPassword !== signupPasswordConfirm) {
      setSignupError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await signup(signupName, signupEmail, signupPassword);
        if (result.success && !result.pendingVerification) {
          window.location.assign("/");
        } else if (result.success) {
          setSignupMessage(
            result.message || "Check your email to confirm your account.",
          );
        } else {
          setSignupError(result.error || "Something went wrong.");
        }
      } catch {
        setSignupError("Something went wrong.");
      }
    });
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    startTransition(async () => {
      try {
        const result = await login(loginEmail, loginPassword);
        if (result.success) {
          window.location.assign("/");
        } else {
          setLoginError(result.error || "Something went wrong.");
        }
      } catch {
        setLoginError("Something went wrong.");
      }
    });
  }

  const inputClass =
    "w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-600 outline-none px-4 py-3 text-sm text-zinc-200 rounded-lg transition-colors font-mono placeholder:text-zinc-700";
  const labelClass =
    "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-400 mb-2";
  const passwordInputClass = `${inputClass} pr-14`;
  const eyeButtonClass =
    "absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500 transition-colors hover:text-zinc-300";

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
          <div className="mb-8 flex gap-1 rounded-lg bg-zinc-900/50 p-1">
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 text-[10px] font-mono tracking-[0.3em] uppercase transition-colors ${
                mode === "signup"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-[10px] font-mono tracking-[0.3em] uppercase transition-colors ${
                mode === "login"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Sign In
            </button>
          </div>

          {mode === "signup" ? (
            <>
              <h2 className="mb-1 font-[family-name:var(--font-playfair)] text-2xl italic text-zinc-100">
                Begin your orbit
              </h2>
              <p className="mb-8 text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-500">
                Create your personal axis
              </p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@email.com"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className={passwordInputClass}
                      placeholder="6+ characters"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      aria-label={
                        showSignupPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showSignupPassword}
                      onClick={() => setShowSignupPassword((visible) => !visible)}
                      className={eyeButtonClass}
                    >
                      <EyeIcon visible={showSignupPassword} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Retype Password</label>
                  <div className="relative">
                    <input
                      type={showSignupPasswordConfirm ? "text" : "password"}
                      value={signupPasswordConfirm}
                      onChange={(e) =>
                        setSignupPasswordConfirm(e.target.value)
                      }
                      className={passwordInputClass}
                      placeholder="Retype password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      aria-label={
                        showSignupPasswordConfirm
                          ? "Hide password confirmation"
                          : "Show password confirmation"
                      }
                      aria-pressed={showSignupPasswordConfirm}
                      onClick={() =>
                        setShowSignupPasswordConfirm((visible) => !visible)
                      }
                      className={eyeButtonClass}
                    >
                      <EyeIcon visible={showSignupPasswordConfirm} />
                    </button>
                  </div>
                </div>
                {signupError && (
                  <p className="text-xs font-mono text-red-400/80">
                    {signupError}
                  </p>
                )}
                {signupMessage && (
                  <p className="text-xs font-mono text-zinc-400">
                    {signupMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-2 w-full rounded-lg bg-white py-3 text-[11px] font-mono tracking-[0.3em] uppercase text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
                >
                  {isPending ? "Creating..." : "Create Account"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="mb-1 font-[family-name:var(--font-playfair)] text-2xl italic text-zinc-100">
                Welcome back
              </h2>
              <p className="mb-8 text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-500">
                Return to your orbit
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@email.com"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={passwordInputClass}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      aria-label={
                        showLoginPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showLoginPassword}
                      onClick={() => setShowLoginPassword((visible) => !visible)}
                      className={eyeButtonClass}
                    >
                      <EyeIcon visible={showLoginPassword} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-[10px] font-mono tracking-[0.18em] uppercase text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-40"
                  >
                    Forgot password?
                  </Link>
                </div>
                {loginError && (
                  <p className="text-xs font-mono text-red-400/80">
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-2 w-full rounded-lg border border-zinc-700 py-3 text-[11px] font-mono tracking-[0.3em] uppercase text-zinc-300 transition-colors hover:border-zinc-400 hover:text-white disabled:opacity-40"
                >
                  {isPending ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
