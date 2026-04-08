import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  const role = session?.user?.role;

  const nextStep =
    !session?.user
      ? { href: "/signup", label: "Create your account" }
      : role === "UNSET"
        ? { href: "/onboarding", label: "Finish onboarding" }
        : role === "VENDOR"
          ? { href: "/vendor/dashboard", label: "Open vendor dashboard" }
          : { href: "/marketplace", label: "Browse marketplace" };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <section className="grid gap-6 rounded-[2rem] border border-black/5 bg-white/75 p-8 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.35)] lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-orange-700">
            Backend First
          </span>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Build the marketplace flow first, then polish the experience.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Vendex is shaping into a multi-vendor commerce app with buyer auth,
            vendor onboarding, product variants, stock handling, and order
            flow. This home page is now your launchpad for exploring each piece.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href={nextStep.href}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {nextStep.label}
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              View marketplace
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-slate-950 p-5 text-slate-100">
          <p className="text-sm font-semibold text-orange-300">Session snapshot</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-white/5 p-4 text-xs leading-6 text-slate-200">
            {JSON.stringify(session?.user ?? null, null, 2)}
          </pre>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Auth flow",
            text: "Sign up, log in, and route users into onboarding or their working area.",
            href: "/login",
            cta: "Open login",
          },
          {
            title: "Buyer view",
            text: "Browse published products and see the public marketplace experience.",
            href: "/marketplace",
            cta: "Open marketplace",
          },
          {
            title: "Vendor tools",
            text: "Create products, add variants, manage stock, and publish listings.",
            href: "/vendor/products",
            cta: "Open vendor products",
          },
          {
            title: "Onboarding",
            text: "Choose buyer or vendor role and create the first store identity.",
            href: "/onboarding",
            cta: "Open onboarding",
          },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-[1.5rem] border border-black/5 bg-white/75 p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]"
          >
            <p className="text-lg font-bold text-slate-950">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            <p className="mt-5 text-sm font-semibold text-orange-700 group-hover:text-orange-800">
              {item.cta}
            </p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 rounded-[2rem] border border-black/5 bg-white/70 p-6 lg:grid-cols-3">
        {[
          "Auth and onboarding now map roles into the right areas.",
          "Products follow a variant-based structure, which is what real commerce apps usually need.",
          "Validation is moving into shared schemas so routes stay easier to reason about.",
        ].map((point) => (
          <div key={point} className="rounded-[1.25rem] bg-slate-50 p-5">
            <p className="text-sm leading-6 text-slate-700">{point}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
