import Link from "next/link";
import { createProduct } from "@/lib/actions/product.actions";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/catalog";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="space-y-2">
        <Link href="/vendor/products" className="text-sm font-semibold text-orange-700">
          Back to products
        </Link>
        <h1 className="text-3xl font-black text-slate-950">Create a new product</h1>
        <p className="text-sm leading-6 text-slate-600">
          New products start as <strong>Draft</strong>. After adding variants
          and stock, you can publish them to the public marketplace.
        </p>
      </div>

      <form action={createProduct} className="space-y-4 rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <div className="space-y-2">
          <label className="block text-sm font-medium mb-1">
            Product Title
          </label>
          <input
            name="title"
            required
            placeholder="e.g. Classic T-Shirt"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium mb-1">
            Category
          </label>
          <select
            name="category"
            defaultValue="OTHER"
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
          <label className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows={5}
            placeholder="Describe the product, materials, fit, or key buyer information."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium mb-1">
            Product image URLs
          </label>
          <textarea
            name="imageUrls"
            rows={4}
            placeholder={"One image URL per line\nhttps://example.com/image-1.jpg"}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-extrabold text-white"
        >
          Create Product
        </button>
      </form>
    </div>
  );
}
