"use client";

/**
 * Design 1: "Split Cosmos"
 * Left: dark signup with subtle star-field dots via CSS
 * Right: darker login with a glowing orbital ring accent
 * Clean underline inputs, minimal chrome
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup, login } from "@/lib/auth-actions";

export default function Design1() {
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

  const inputClass = "w-full bg-transparent border-b border-zinc-800 focus:border-zinc-400 outline-none py-2.5 text-sm text-zinc-200 transition-colors font-mono placeholder:text-zinc-700";
  const labelClass = "block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-600 mb-2";

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col">
      <header className="flex items-center justify-center pt-10 pb-4">
        <Link href="/" className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors">AXIS</Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 min-h-[520px]">

          {/* Left — Signup */}
          <div className="relative p-10 md:p-14 bg-zinc-950 border border-zinc-800/50 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden">
            {/* Star dots */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "radial-gradient(1px 1px at 20px 30px, white, transparent), radial-gradient(1px 1px at 40px 70px, white, transparent), radial-gradient(1px 1px at 90px 40px, white, transparent), radial-gradient(1px 1px at 130px 80px, white, transparent), radial-gradient(1px 1px at 170px 20px, white, transparent), radial-gradient(1px 1px at 200px 60px, white, transparent), radial-gradient(1px 1px at 60px 120px, white, transparent), radial-gradient(1px 1px at 150px 130px, white, transparent)",
            }} />
            <div className="relative z-10">
              <h2 className="font-[family-name:var(--font-playfair)] italic text-3xl text-zinc-100 mb-1">Create account</h2>
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-10">Build your solar system</p>
              <form onSubmit={handleSignup} className="space-y-6">
                <div><label className={labelClass}>Name</label><input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} className={inputClass} placeholder="Your name" required /></div>
                <div><label className={labelClass}>Email</label><input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
                <div><label className={labelClass}>Password</label><input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className={inputClass} placeholder="6+ characters" required minLength={6} /></div>
                {signupError && <p className="text-red-400/80 text-xs font-mono">{signupError}</p>}
                <button type="submit" disabled={isPending} className="w-full py-3 bg-white text-black text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-40 mt-2">
                  {isPending ? "Creating..." : "Create Account"}
                </button>
              </form>
            </div>
          </div>

          {/* Right — Login */}
          <div className="relative p-10 md:p-14 bg-black border border-zinc-800/50 border-t-0 md:border-t md:border-l-0 rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none flex flex-col justify-center">
            {/* Orbital ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-zinc-800/30 opacity-30" />
            <div className="relative z-10">
              <h2 className="font-[family-name:var(--font-playfair)] italic text-3xl text-zinc-100 mb-1">Welcome back</h2>
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-10">Return to your orbit</p>
              <form onSubmit={handleLogin} className="space-y-6">
                <div><label className={labelClass}>Email</label><input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputClass} placeholder="you@email.com" required /></div>
                <div><label className={labelClass}>Password</label><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={inputClass} placeholder="Enter password" required /></div>
                {loginError && <p className="text-red-400/80 text-xs font-mono">{loginError}</p>}
                <button type="submit" disabled={isPending} className="w-full py-3 border border-zinc-700 text-zinc-300 text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:border-zinc-400 hover:text-white transition-colors disabled:opacity-40 mt-2">
                  {isPending ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
