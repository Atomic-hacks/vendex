/* eslint-disable @typescript-eslint/no-explicit-any */
// app/vendor/products/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProductStatus, deleteProduct } from "@/lib/actions/product.actions";
import { getCategoryLabel } from "@/lib/catalog";
import Link from "next/link";

export default async function ProductsPage() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  const products = await prisma.product.findMany({
    where: { vendorId },
    include: { variants: { include: { inventory: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-slate-500">
            Draft products stay private. Published products appear in the
            marketplace and your storefront. Archived products stay hidden.
          </p>
        </div>
        <Link href="/vendor/products/new" className="bg-black text-white px-4 py-2 rounded">
          + New Product
        </Link>
      </div>

      {products.map((p) => {
        const totalStock = p.variants.reduce(
          (sum, v) => sum + (v.inventory?.quantity ?? 0), 0
        );
        const minPrice = p.variants.length
          ? Math.min(...p.variants.map((variant) => variant.price))
          : null;
        const purchasableVariants = p.variants.filter(
          (variant) => variant.price > 0 && (variant.inventory?.quantity ?? 0) > 0,
        ).length;
        const readinessIssues = [
          !p.title.trim() ? "title" : null,
          !p.description?.trim() ? "description" : null,
          p.imageUrls.length === 0 ? "images" : null,
          p.variants.length === 0 ? "variants" : null,
          purchasableVariants === 0 ? "buyable variant" : null,
        ].filter(Boolean);

        return (
          <div key={p.id} className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
              <p className="font-medium">{p.title}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                {getCategoryLabel(p.category)}
              </p>
              <p className="text-sm text-gray-500">
                {p.variants.length} variants · {totalStock} in stock
                {minPrice != null ? ` · from ₦${(minPrice / 100).toLocaleString()}` : ""}
              </p>
              {p.description && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {p.description}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {p.imageUrls.length} images · {purchasableVariants} buyable variants
              </p>
              {readinessIssues.length > 0 && (
                <p className="mt-2 text-xs font-semibold text-orange-700">
                  Missing for publish quality: {readinessIssues.join(", ")}
                </p>
              )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  p.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                  p.status === "ARCHIVED" ? "bg-gray-100 text-gray-500" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {p.status}
                </span>

                <Link href={`/vendor/products/${p.id}`} className="rounded-full border border-slate-200 px-3 py-2 text-sm text-blue-600">
                  Edit
                </Link>

                {p.status !== "DRAFT" && (
                  <form action={updateProductStatus.bind(null, p.id, "DRAFT")}>
                    <button className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      Move to Draft
                    </button>
                  </form>
                )}

                {p.status !== "PUBLISHED" && (
                  <form action={updateProductStatus.bind(null, p.id, "PUBLISHED")}>
                    <button className="rounded-full border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      Publish
                    </button>
                  </form>
                )}

                {p.status !== "ARCHIVED" && (
                  <form action={updateProductStatus.bind(null, p.id, "ARCHIVED")}>
                    <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      Archive
                    </button>
                  </form>
                )}

                {p.status === "DRAFT" && (
                  <form action={deleteProduct.bind(null, p.id)}>
                    <button className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
