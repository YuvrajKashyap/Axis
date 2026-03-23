"use client";

/**
 * Design 3: "Full Bleed Split"
 * Full-height two-column layout, no card borders
 * Left column: dark with signup, has the AXIS branding large
 * Right column: slightly lighter with login
 * Bold, immersive, editorial
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup, login } from "@/lib/auth-actions";

export default function Design3() {
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

  const inputClass = "w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none py-3 text-sm text-zinc-200 transition-colors font-mono placeholder:text-zinc-700";
  const labelClass = "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-600 mb-2";

  return (
    <div className="min-h-screen bg-black text-zinc-200 grid grid-cols-1 md:grid-cols-2">
      {/* Left — Signup */}
      <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 bg-black">
        <Link href="/" className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-600 hover:text-zinc-400 transition-colors mb-16">← AXIS</Link>

        <h1 className="font-[family-name:var(--font-playfair)] italic text-4xl md:text-5xl text-zinc-100 mb-3 leading-tight">
          Find your<br />center.
        </h1>
        <p className="text-[11px] font-mono tracking-[0.15em] text-zinc-600 mb-12 max-w-xs">
          Create an account to build your personal alignment system.
        </p>

        <form onSubmit={handleSignup} className="space-y-6 max-w-sm">
          <div><label className={labelClass}>Name</label><input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} className={inputClass} placeholder="Your name" required /></div>
          <div><label className={labelClass}>Email</label><input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
          <div><label className={labelClass}>Password</label><input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className={inputClass} placeholder="6+ characters" required minLength={6} /></div>
          {signupError && <p className="text-red-400/80 text-xs font-mono">{signupError}</p>}
          <button type="submit" disabled={isPending} className="w-full py-3.5 bg-zinc-100 text-black text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:bg-white transition-colors disabled:opacity-40">
            {isPending ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>

      {/* Right — Login */}
      <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-900">
        <div className="md:mt-24">
          <h2 className="font-[family-name:var(--font-playfair)] italic text-3xl text-zinc-100 mb-2">Welcome back</h2>
          <p className="text-[11px] font-mono tracking-[0.15em] text-zinc-600 mb-12">
            Sign in to return to your orbit.
          </p>

          <form onSubmit={handleLogin} className="space-y-6 max-w-sm">
            <div><label className={labelClass}>Email</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
            <div><label className={labelClass}>Password</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={inputClass} placeholder="Enter password" required /></div>
            {loginError && <p className="text-red-400/80 text-xs font-mono">{loginError}</p>}
            <button type="submit" disabled={isPending} className="w-full py-3.5 border border-zinc-700 text-zinc-400 text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40">
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
