"use client";

/**
 * Design 4: "Floating Panels"
 * Two floating glass-morphism cards side by side
 * Background has a subtle gradient orb
 * Rounded inputs with background fill
 * More modern/glass aesthetic
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup, login } from "@/lib/auth-actions";

export default function Design4() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  const inputClass = "w-full bg-zinc-900/60 border border-zinc-800/50 focus:border-zinc-600 outline-none px-4 py-3 text-sm text-zinc-200 rounded-xl transition-all font-mono placeholder:text-zinc-700 focus:bg-zinc-900/80";
  const labelClass = "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-2";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-900/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-zinc-700/5 rounded-full blur-[100px]" />

      <header className="absolute top-10 left-1/2 -translate-x-1/2 z-20">
        <Link href="/" className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors">AXIS</Link>
      </header>

      <main className="relative z-10 w-full max-w-5xl px-6 flex flex-col md:flex-row items-stretch gap-6 md:gap-8">
        {/* Left — Signup */}
        <div className="flex-1 bg-zinc-950/40 backdrop-blur-xl border border-zinc-800/40 rounded-3xl p-8 md:p-10">
          <div className="w-8 h-8 rounded-full border border-zinc-700/50 flex items-center justify-center mb-6">
            <span className="text-zinc-500 text-xs">+</span>
          </div>
          <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl md:text-3xl text-zinc-100 mb-1">Create account</h2>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-8">Start building your solar system</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div><label className={labelClass}>Name</label><input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} className={inputClass} placeholder="Your name" required /></div>
            <div><label className={labelClass}>Email</label><input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
            <div><label className={labelClass}>Password</label><input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className={inputClass} placeholder="6+ characters" required minLength={6} /></div>
            {signupError && <p className="text-red-400/80 text-xs font-mono">{signupError}</p>}
            <button type="submit" disabled={isPending} className="w-full py-3.5 bg-zinc-100 text-black text-[11px] font-mono tracking-[0.3em] uppercase rounded-xl hover:bg-white transition-all disabled:opacity-40 mt-2">
              {isPending ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* Right — Login */}
        <div className="flex-1 bg-zinc-950/30 backdrop-blur-xl border border-zinc-800/30 rounded-3xl p-8 md:p-10 flex flex-col justify-center">
          <div className="w-8 h-8 rounded-full border border-zinc-700/50 flex items-center justify-center mb-6">
            <span className="text-zinc-500 text-xs">→</span>
          </div>
          <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl md:text-3xl text-zinc-100 mb-1">Sign in</h2>
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-8">Return to your orbit</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className={labelClass}>Email</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
            <div><label className={labelClass}>Password</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={inputClass} placeholder="Enter password" required /></div>
            {loginError && <p className="text-red-400/80 text-xs font-mono">{loginError}</p>}
            <button type="submit" disabled={isPending} className="w-full py-3.5 border border-zinc-700/60 text-zinc-400 text-[11px] font-mono tracking-[0.3em] uppercase rounded-xl hover:border-zinc-500 hover:text-zinc-200 transition-all disabled:opacity-40 mt-2">
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
