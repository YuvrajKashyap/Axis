"use client";

/**
 * Design 5: "Minimal Vertical"
 * Single column, vertically stacked — signup on top, divider, login below
 * Very minimal, almost text-only
 * Large Playfair heading, extreme whitespace
 * Feels like a luxury editorial site
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup, login } from "@/lib/auth-actions";

export default function Design5() {
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

  const inputClass = "w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none py-2.5 text-sm text-zinc-200 transition-colors font-mono placeholder:text-zinc-700";
  const labelClass = "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-600 mb-2";

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <header className="flex items-center justify-center pt-12 pb-4">
        <Link href="/" className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors">AXIS</Link>
      </header>

      <main className="max-w-md mx-auto px-6 py-16">
        {/* Signup */}
        <section>
          <h1 className="font-[family-name:var(--font-playfair)] italic text-4xl md:text-5xl text-zinc-100 mb-2 text-center">
            Enter the system
          </h1>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-zinc-600 text-center mb-12">
            Create your account
          </p>

          <form onSubmit={handleSignup} className="space-y-5">
            <div><label className={labelClass}>Name</label><input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} className={inputClass} placeholder="Your name" required /></div>
            <div><label className={labelClass}>Email</label><input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
            <div><label className={labelClass}>Password</label><input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className={inputClass} placeholder="6+ characters" required minLength={6} /></div>
            {signupError && <p className="text-red-400/80 text-xs font-mono">{signupError}</p>}
            <button type="submit" disabled={isPending} className="w-full py-3 bg-zinc-100 text-black text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:bg-white transition-colors disabled:opacity-40">
              {isPending ? "Creating..." : "Create Account"}
            </button>
          </form>
        </section>

        {/* Divider */}
        <div className="flex items-center gap-4 my-16">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[10px] font-mono tracking-[0.4em] uppercase text-zinc-700">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Login */}
        <section>
          <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl text-zinc-100 mb-1 text-center">
            Welcome back
          </h2>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-zinc-600 text-center mb-10">
            Return to your orbit
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div><label className={labelClass}>Email</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
            <div><label className={labelClass}>Password</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={inputClass} placeholder="Enter password" required /></div>
            {loginError && <p className="text-red-400/80 text-xs font-mono">{loginError}</p>}
            <button type="submit" disabled={isPending} className="w-full py-3 border border-zinc-700 text-zinc-400 text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40">
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </section>

        <p className="text-center text-[10px] font-mono tracking-[0.2em] text-zinc-700 mt-20">
          Your data stays yours. No tracking. No algorithms.
        </p>
      </main>
    </div>
  );
}
