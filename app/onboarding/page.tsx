/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<"BUYER" | "VENDOR">("BUYER");
  const [storeName, setStoreName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { update } = useSession();

  async function submit() {
    setErr(null);
    setLoading(true);

    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        storeName: role === "VENDOR" ? storeName : undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.error === "Role already set") {
        router.push("/post-auth");
        return;
      }

      setErr(data.error ?? "Failed");
      return;
    }

    await update();
    router.push("/post-auth");
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] bg-emerald-50 p-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
          Final setup
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
          Choose how this account will move through the app.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          This page turns a signed-in account into a buyer or a vendor. Buyers
          go to browsing and purchase flow. Vendors get a store profile and the
          tools to create listings and manage inventory.
        </p>

        <div className="mt-8 rounded-[1.5rem] bg-white p-5">
          <p className="font-semibold text-slate-950">What happens next?</p>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600">
            <p>Buyer: redirected to the marketplace and public shopping flow.</p>
            <p>Vendor: redirected into vendor dashboard and product tools.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <h2 className="text-2xl font-black text-slate-950">Finish setup</h2>
        <p className="mt-2 text-sm text-slate-500">
          Google accounts usually land here first because they still need a
          permanent app role.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Account type
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-300"
            >
              <option value="BUYER">Buyer</option>
              <option value="VENDOR">Vendor</option>
            </select>
          </label>

          {role === "VENDOR" && (
            <input
              placeholder="Store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-300"
            />
          )}

          {err && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </p>
          )}

          <button
            disabled={loading || (role === "VENDOR" && !storeName.trim())}
            onClick={submit}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-600">
          Want to inspect the public experience first?{" "}
          <Link href="/marketplace" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Open marketplace
          </Link>
        </p>
      </section>
    </div>
  );
}
