"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signup, login } from "@/lib/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");

  // Login state
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

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center pt-10 pb-6">
        <Link href="/" className="font-mono text-[11px] tracking-[0.5em] uppercase text-zinc-500 hover:text-zinc-300 transition-colors">
          AXIS
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-px bg-zinc-900/50 rounded-2xl overflow-hidden border border-zinc-800/60">

          {/* Left — Create Account */}
          <div className="p-8 md:p-12 bg-black/80">
            <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl md:text-3xl text-zinc-100 mb-2">
              Create account
            </h2>
            <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-8">
              Build your solar system
            </p>

            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none py-2 text-sm text-zinc-200 transition-colors font-mono"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none py-2 text-sm text-zinc-200 transition-colors font-mono"
                  placeholder="you@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none py-2 text-sm text-zinc-200 transition-colors font-mono"
                  placeholder="6+ characters"
                  required
                  minLength={6}
                />
              </div>

              {signupError && (
                <p className="text-red-400/80 text-xs font-mono">{signupError}</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-4 py-3 bg-zinc-100 text-black text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:bg-white transition-colors disabled:opacity-40"
              >
                {isPending ? "Creating..." : "Create Account"}
              </button>
            </form>
          </div>

          {/* Divider */}
          <div className="hidden md:block absolute left-1/2 top-1/2 -translate-y-1/2 z-10">
            <div className="w-px h-40 bg-gradient-to-b from-transparent via-zinc-700 to-transparent" />
          </div>

          {/* Right — Sign In */}
          <div className="p-8 md:p-12 bg-black/60 border-t md:border-t-0 border-zinc-800/40">
            <h2 className="font-[family-name:var(--font-playfair)] italic text-2xl md:text-3xl text-zinc-100 mb-2">
              Welcome back
            </h2>
            <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-8">
              Return to your orbit
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none py-2 text-sm text-zinc-200 transition-colors font-mono"
                  placeholder="you@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-500 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none py-2 text-sm text-zinc-200 transition-colors font-mono"
                  placeholder="Enter password"
                  required
                />
              </div>

              {loginError && (
                <p className="text-red-400/80 text-xs font-mono">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-4 py-3 border border-zinc-700 text-zinc-300 text-[11px] font-mono tracking-[0.3em] uppercase rounded-lg hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-40"
              >
                {isPending ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
