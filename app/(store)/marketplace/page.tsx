import { getMarketplaceProducts } from "@/lib/queries/products"
import { addToCart } from "@/lib/actions/cart.actions";
import { PRODUCT_CATEGORY_OPTIONS, PRODUCT_SORT_OPTIONS, getCategoryLabel } from "@/lib/catalog";
import type { CatalogCategoryFilter, CatalogSortOption } from "@/lib/catalog";
import Link from "next/link"

// searchParams comes from the URL e.g. /marketplace?search=shirt
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; sort?: string }>
}) {
  const params = await searchParams

  console.log("[MarketplacePage]", params)

  const products = await getMarketplaceProducts({
    search: params.search,
    category: (params.category as CatalogCategoryFilter) ?? "ALL",
    sort: (params.sort as CatalogSortOption) ?? "newest",
  })


  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-sm text-gray-500">{products.length} products</p>
      </div>

      {/* Search — just a plain GET form, no JS needed */}
      <form method="GET" className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 md:grid-cols-[1fr_220px_220px_auto]">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search products..."
          className="border rounded px-3 py-2 flex-1"
        />
        <select
          name="category"
          defaultValue={params.category ?? "ALL"}
          className="border rounded px-3 py-2"
        >
          <option value="ALL">All categories</option>
          {PRODUCT_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "newest"}
          className="border rounded px-3 py-2"
        >
          {PRODUCT_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" className="bg-black text-white px-4 py-2 rounded">
          Apply
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/marketplace"
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            !params.category || params.category === "ALL"
              ? "bg-slate-950 text-white"
              : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          All
        </Link>
        {PRODUCT_CATEGORY_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={`/marketplace?category=${option.value}${params.search ? `&search=${encodeURIComponent(params.search)}` : ""}${params.sort ? `&sort=${encodeURIComponent(params.sort)}` : ""}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              params.category === option.value
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-gray-400 py-10 text-center">No products found.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const variant = product.variants[0]
          const inStock = (variant?.inventory?.quantity ?? 0) > 0

          return (
            <div key={product.id} className="border rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                {getCategoryLabel(product.category)}
              </p>
              <Link href={`/products/${product.id}`} className="block">
                <h2 className="font-semibold hover:underline">{product.title}</h2>
              </Link>

              {product.description && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {product.description}
                </p>
              )}

              <p className="text-lg font-bold">
                {variant
                  ? `₦${(variant.price / 100).toLocaleString()}`
                  : "No variants yet"}
              </p>

              <p className={`text-xs ${inStock ? "text-green-600" : "text-red-500"}`}>
                {inStock ? "In stock" : "Out of stock"}
              </p>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Link
                  href={`/store/${product.vendor.slug}`}
                  className="text-sm text-gray-500 hover:underline block"
                >
                  {product.vendor.storeName}
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/products/${product.id}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                  >
                    View
                  </Link>
                  <form action={addToCart.bind(null, product.id, variant?.id)}>
                    <button
                      disabled={!variant || !inStock}
                      className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add to cart
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
