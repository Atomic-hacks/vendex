/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VariantBuilder } from "../../../../components/variant-builder";
import {
  deleteProduct,
  updateProductDetails,
  updateProductStatus,
} from "@/lib/actions/product.actions";
import { PRODUCT_CATEGORY_OPTIONS, getCategoryLabel } from "@/lib/catalog";
import Link from "next/link";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>; // ← Promise in Next.js 15
}) {
  const { productId } = await params; // ← must await it
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  const product = await prisma.product.findFirst({
    // ← findFirst, not findUnique
    where: { id: productId, vendorId }, // ← now both fields work
    include: {
      variantOptions: { include: { values: true } },
      variants: {
        include: {
          inventory: true,
          values: { include: { value: true } },
        },
      },
    },
  });

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="space-y-3">
        <Link href="/vendor/products" className="text-sm font-semibold text-orange-700">
          Back to products
        </Link>

        <div className="flex flex-col gap-4 rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
              {getCategoryLabel(product.category)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Use the controls below to keep this product private as a draft,
              publish it to the marketplace, or archive it later.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                product.status === "PUBLISHED"
                  ? "bg-green-100 text-green-700"
                  : product.status === "ARCHIVED"
                    ? "bg-gray-100 text-gray-500"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {product.status}
            </span>

            {product.status !== "DRAFT" && (
              <form action={updateProductStatus.bind(null, product.id, "DRAFT")}>
                <button className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  Move to Draft
                </button>
              </form>
            )}

            {product.status !== "PUBLISHED" && (
              <form action={updateProductStatus.bind(null, product.id, "PUBLISHED")}>
                <button className="rounded-full border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  Publish
                </button>
              </form>
            )}

            {product.status !== "ARCHIVED" && (
              <form action={updateProductStatus.bind(null, product.id, "ARCHIVED")}>
                <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Archive
                </button>
              </form>
            )}

            {product.status === "DRAFT" && (
              <form action={deleteProduct.bind(null, product.id)}>
                <button className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  Delete draft
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-950">Product details</h2>
          <p className="mt-2 text-sm text-slate-600">
            Fill this out before publishing. Buyers need more than a title to
            make a decision.
          </p>
        </div>

        <form action={updateProductDetails.bind(null, product.id)} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Product title
            </label>
            <input
              name="title"
              defaultValue={product.title}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              name="category"
              defaultValue={product.category}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            >
              {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              name="description"
              rows={6}
              defaultValue={product.description ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Product image URLs
            </label>
            <textarea
              name="imageUrls"
              rows={5}
              defaultValue={product.imageUrls.join("\n")}
              placeholder={"One image URL per line\nhttps://example.com/image-1.jpg"}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>

          <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white">
            Save product details
          </button>
        </form>
      </section>

      <VariantBuilder
        productId={product.id}
        initialOptions={product.variantOptions}
        initialVariants={product.variants}
      />
    </div>
  );
}
