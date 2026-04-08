import { notFound } from "next/navigation";
import { getVendorBySlug } from "@/lib/queries/vendors";
import { getMarketplaceProducts } from "@/lib/queries/products";
import { addToCart } from "@/lib/actions/cart.actions";
import Link from "next/link";

export default async function VendorStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: { search?: string };
}) {
  const { slug } = await params;

  console.log("[VendorStorePage] slug:", slug);

  const vendor = await getVendorBySlug(slug);

  if (!vendor || vendor.status !== "APPROVED") {
    console.warn("[VendorStorePage] vendor not found or not approved:", slug);
    notFound();
  }

  const products = await getMarketplaceProducts({
    vendorId: vendor.id,
    search: searchParams?.search,
  });

  console.log(
    "[VendorStorePage] loaded",
    products.length,
    "products for",
    vendor.storeName,
  );

  return (
    <div>
      <div className="relative h-48 bg-gray-100">
        {vendor.bannerUrl && (
          <img
            src={vendor.bannerUrl}
            alt="banner"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          {vendor.logoUrl && (
            <img
              src={vendor.logoUrl}
              alt="logo"
              className="w-16 h-16 rounded-full object-cover border"
            />
          )}

          <div>
            <h1 className="text-2xl font-bold">{vendor.storeName}</h1>
            {vendor.description && (
              <p className="text-gray-500 text-sm">{vendor.description}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-400">{products.length} products</p>

        {products.length === 0 && (
          <p className="text-gray-400 py-10 text-center">
            This store has no published products yet.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const variant = product.variants[0];
            const inStock = (variant?.inventory?.quantity ?? 0) > 0;

            return (
              <div key={product.id} className="border rounded-lg p-4 space-y-2">
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
                    : "No price set"}
                </p>

                <p
                  className={`text-xs ${
                    inStock ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {inStock ? "In stock" : "Out of stock"}
                </p>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/products/${product.id}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    View details
                  </Link>
                  <form action={addToCart.bind(null, product.id, variant?.id)}>
                    <button
                      disabled={!variant || !inStock}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add to cart
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
