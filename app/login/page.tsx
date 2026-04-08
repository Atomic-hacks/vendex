"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loginCreds(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    if (session?.user) {
      await signOut({ redirect: false });
    }

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/post-auth",
    });

    setLoading(false);

    if (!res?.ok) {
      setErr("Invalid credentials, or this account was created with Google only.");
      return;
    }

    router.push("/post-auth");
  }

  async function loginWithGoogle() {
    setErr(null);
    setLoading(true);

    if (session?.user) {
      await signOut({ redirect: false });
    }

    await signIn("google", { callbackUrl: "/post-auth" });
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] bg-slate-950 p-8 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">
          Welcome back
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          Log in and continue building Vendex.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Email login is useful for local testing. Google login helps us test
          OAuth and role-based onboarding. After sign-in, the app sends users
          into the correct flow automatically.
        </p>

        <div className="mt-8 rounded-[1.5rem] bg-white/10 p-5 text-sm text-slate-200">
          <p className="font-semibold text-white">Useful starting points</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/signup" className="text-orange-200 hover:text-orange-100">
              Create a new account
            </Link>
            <Link href="/marketplace" className="text-orange-200 hover:text-orange-100">
              Preview the marketplace
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <h2 className="text-2xl font-black text-slate-950">Sign in</h2>

        {session?.user && (
          <div className="mt-6 rounded-[1.5rem] border border-orange-200 bg-orange-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">
              You are currently signed in as {session.user.email}.
            </p>
            <p className="mt-2 leading-6">
              Signing in below will replace the current session on this browser
              with another account.
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-3 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Sign out first
            </button>
          </div>
        )}

        <button
          onClick={loginWithGoogle}
          disabled={loading || status === "loading"}
          className="mt-6 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Preparing sign-in..." : "Continue with Google"}
        </button>

        <div className="my-5 text-center text-sm text-slate-400">or use email</div>

        <form onSubmit={loginCreds} className="grid gap-4">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-300"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-300"
          />

          {err && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </p>
          )}

          <button
            disabled={loading || status === "loading"}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in with email"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          No account?{" "}
          <Link href="/signup" className="font-semibold text-orange-700 hover:text-orange-800">
            Sign up
          </Link>
        </p>
      </section>
    </div>
  );
}
