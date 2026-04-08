import Link from "next/link";
import { notFound } from "next/navigation";
import { getMarketplaceProductById } from "@/lib/queries/products";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getMarketplaceProductById(productId);

  if (!product) {
    notFound();
  }

  const heroImage = product.imageUrls[0] ?? null;
  const lowestPrice = product.variants[0]?.price ?? null;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6">
        <Link href="/marketplace" className="text-sm font-semibold text-orange-700">
          Back to marketplace
        </Link>

        <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white/80 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
          <div className="aspect-[4/3] bg-slate-100">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No product image yet
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
          <div className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-700">
              {product.vendor.storeName}
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              {product.title}
            </h1>
            {lowestPrice != null && (
              <p className="text-lg font-semibold text-slate-600">
                From ₦{(lowestPrice / 100).toLocaleString()}
              </p>
            )}
          </div>

          {product.description ? (
            <p className="text-sm leading-7 text-slate-600">{product.description}</p>
          ) : (
            <p className="text-sm leading-7 text-slate-400">
              This vendor has not added a product description yet.
            </p>
          )}

          {product.imageUrls.length > 1 && (
            <div className="grid grid-cols-3 gap-3">
              {product.imageUrls.slice(1, 4).map((imageUrl) => (
                <div
                  key={imageUrl}
                  className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={product.title}
                    className="aspect-square h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <ProductPurchasePanel
          productId={product.id}
          options={product.variantOptions}
          variants={product.variants}
        />

        <div className="rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
            Store
          </p>
          <p className="mt-3 text-lg font-bold text-slate-950">
            {product.vendor.storeName}
          </p>
          {product.vendor.description && (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {product.vendor.description}
            </p>
          )}
          <Link
            href={`/store/${product.vendor.slug}`}
            className="mt-4 inline-flex text-sm font-semibold text-orange-700"
          >
            Visit storefront
          </Link>
        </div>
      </section>
    </div>
  );
}
