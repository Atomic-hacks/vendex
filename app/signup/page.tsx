/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"BUYER" | "VENDOR">("BUYER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: name || undefined,
        role,
        storeName: role === "VENDOR" ? storeName : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErr(data.error ?? "Signup failed");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] bg-orange-50 p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-700">
          Start here
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
          Create the first account for your marketplace journey.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Buyers can browse and purchase products. Vendors get a store profile,
          product management, variants, and inventory controls. Pick the role
          you want to explore first.
        </p>

        <div className="mt-8 grid gap-3">
          <div className="rounded-[1.5rem] bg-white p-5">
            <p className="font-semibold text-slate-950">Buyer path</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ideal for testing public browsing, cart flow, and checkout logic.
            </p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-5">
            <p className="font-semibold text-slate-950">Vendor path</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ideal for testing onboarding, product creation, variant building,
              and stock updates.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <h2 className="text-2xl font-black text-slate-950">Create account</h2>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Account type
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-300"
            >
              <option value="BUYER">Buyer</option>
              <option value="VENDOR">Vendor</option>
            </select>
          </label>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-300"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-300"
          />
          <input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-300"
          />

          {role === "VENDOR" && (
            <input
              placeholder="Store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-300"
            />
          )}

          {err && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </p>
          )}

          <button
            disabled={loading || (role === "VENDOR" && !storeName.trim())}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-orange-700 hover:text-orange-800">
            Log in
          </Link>
        </p>
      </section>
    </div>
  );
}
