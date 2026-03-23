"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup, login } from "@/lib/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"signup" | "login">("signup");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    startTransition(async () => {
      const result = await signup(signupName, signupEmail, signupPassword);
      if (result.success) {
        router.push("/");
        router.refresh();
      } else {
        setSignupError(result.error || "Something went wrong.");
      }
    });
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    startTransition(async () => {
      const result = await login(loginEmail, loginPassword);
      if (result.success) {
        router.push("/");
        router.refresh();
      } else {
        setLoginError(result.error || "Something went wrong.");
      }
    });
  }

  const inputClass =
    "w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-600 outline-none px-4 py-3 text-sm text-zinc-200 rounded-lg transition-colors font-mono placeholder:text-zinc-700";
  const labelClass =
    "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-2";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black text-zinc-200">
      <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-800/10 blur-3xl" />

      <header className="absolute top-10 left-1/2 -translate-x-1/2">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-500 transition-colors hover:text-zinc-300"
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
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-[10px] font-mono tracking-[0.3em] uppercase transition-colors ${
                mode === "login"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-400"
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
              <p className="mb-8 text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600">
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
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className={inputClass}
                    placeholder="6+ characters"
                    required
                    minLength={6}
                  />
                </div>
                {signupError && (
                  <p className="text-xs font-mono text-red-400/80">
                    {signupError}
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
              <p className="mb-8 text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600">
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
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Enter password"
                    required
                  />
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
