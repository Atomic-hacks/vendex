import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
    >
      {label}
    </Link>
  );
}

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <Link href="/" className="text-lg font-black tracking-tight text-slate-950">
            Vendex
          </Link>
          <p className="text-xs text-slate-500">
            Multi-vendor commerce playground
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-end gap-2">
          <NavLink href="/" label="Overview" />
          <NavLink href="/marketplace" label="Marketplace" />

          {!session?.user && (
            <>
              <NavLink href="/login" label="Login" />
              <NavLink href="/signup" label="Sign up" />
            </>
          )}

          {role === "UNSET" && <NavLink href="/onboarding" label="Finish setup" />}
          {role === "BUYER" && (
            <>
              <NavLink href="/cart" label="Cart" />
              <NavLink href="/orders" label="Orders" />
            </>
          )}
          {role === "VENDOR" && (
            <>
              <NavLink href="/vendor/dashboard" label="Dashboard" />
              <NavLink href="/vendor/products" label="Products" />
              <NavLink href="/vendor/orders" label="Orders" />
            </>
          )}

          {session?.user && <LogoutButton />}
        </nav>
      </div>
    </header>
  );
}
