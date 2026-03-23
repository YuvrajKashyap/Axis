"use client";

/**
 * Design 2: "Centered Card"
 * Single centered card with tabs to switch between signup and login
 * Floating card on a dark background with subtle radial glow
 * More compact, app-like feel
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup, login } from "@/lib/auth-actions";

export default function Design2() {
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
      if (result.success) { router.push("/"); router.refresh(); }
      else setSignupError(result.error || "Something went wrong.");
    });
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    startTransition(async () => {
      const result = await login(loginEmail, loginPassword);
      if (result.success) { router.push("/"); router.refresh(); }
      else setLoginError(result.error || "Something went wrong.");
    });
  }

  const inputClass = "w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-600 outline-none px-4 py-3 text-sm text-zinc-200 rounded-lg transition-colors font-mono placeholder:text-zinc-700";
  const labelClass = "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-2";

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col items-center justify-center relative">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/10 rounded-full blur-3xl" />

      <header className="absolute top-10 left-1/2 -translate-x-1/2">
        <Link href="/" className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors">AXIS</Link>
      </header>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-2xl p-8 md:p-10 backdrop-blur-sm">
          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-zinc-900/50 rounded-lg p-1">
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-[10px] font-mono tracking-[0.3em] uppercase rounded-md transition-colors ${mode === "signup" ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:text-zinc-400"}`}
            >
              Create Account
            </button>
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-[10px] font-mono tracking-[0.3em] uppercase rounded-md transition-colors ${mode === "login" ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:text-zinc-400"}`}
            >
              Sign In
            </button>
          </div>

          {mode === "signup" ? (
            <>
              <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl text-zinc-100 mb-1">Begin your orbit</h2>
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-8">Create your personal axis</p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div><label className={labelClass}>Name</label><input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} className={inputClass} placeholder="Your name" required /></div>
                <div><label className={labelClass}>Email</label><input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
                <div><label className={labelClass}>Password</label><input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className={inputClass} placeholder="6+ characters" required minLength={6} /></div>
                {signupError && <p className="text-red-400/80 text-xs font-mono">{signupError}</p>}
                <button type="submit" disabled={isPending} className="w-full py-3 bg-white text-black text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-40 mt-2">
                  {isPending ? "Creating..." : "Create Account"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl text-zinc-100 mb-1">Welcome back</h2>
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-8">Return to your orbit</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div><label className={labelClass}>Email</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
                <div><label className={labelClass}>Password</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={inputClass} placeholder="Enter password" required /></div>
                {loginError && <p className="text-red-400/80 text-xs font-mono">{loginError}</p>}
                <button type="submit" disabled={isPending} className="w-full py-3 border border-zinc-700 text-zinc-300 text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:border-zinc-400 hover:text-white transition-colors disabled:opacity-40 mt-2">
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
