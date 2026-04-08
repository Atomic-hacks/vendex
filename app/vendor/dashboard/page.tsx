import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email
    },
    include: {
      vendorProfile: true
    }
  })

  if (!user?.vendorProfile) {
    redirect("/onboarding")
  }

  const products = await prisma.product.findMany({
    where: {
      vendorId: user.vendorProfile.id
    },
    include: {
      variants: {
        include: {
          inventory: true,
        },
        orderBy: {
          price: "asc",
        },
        take: 1,
      },
    },
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-700">
              Vendor workspace
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">
              {user.vendorProfile.storeName}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage listings, variants, and stock from here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/vendor/orders" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              View orders
            </Link>
            <Link href="/vendor/products" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Manage products
            </Link>
            <Link href="/vendor/products/new" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Add product
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] bg-white/80 p-5">
          <p className="text-sm text-slate-500">Total products</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{products.length}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white/80 p-5">
          <p className="text-sm text-slate-500">Published</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {products.filter((product) => product.status === "PUBLISHED").length}
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-white/80 p-5">
          <p className="text-sm text-slate-500">Drafts</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {products.filter((product) => product.status === "DRAFT").length}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8">
        <h2 className="text-xl font-bold mb-4">Products</h2>

        <ul className="space-y-2">
        {products.map((product) => (
          <li
            key={product.id}
            className="rounded-2xl border border-slate-200 p-4"
          >
            {product.title} —{" "}
            {product.variants[0]
              ? `₦${(product.variants[0].price / 100).toLocaleString()}`
              : "No variant price yet"}
          </li>
        ))}
        </ul>
      </section>
    </div>
  )
}
