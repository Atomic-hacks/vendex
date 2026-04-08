import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { addToCart } from "@/lib/actions/cart.actions";
import Link from "next/link";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const store = await prisma.vendorProfile.findUnique({
    where: {
      slug,
    },
    include: {
      products: {
        where: {
          status: "PUBLISHED",
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
      },
    },
  });

  if (!store) return notFound();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{store.storeName}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {store.products.map((product) => (
          <div
            key={product.id}
            className="border rounded-xl p-4 hover:shadow-lg transition"
          >
            <Link href={`/products/${product.id}`} className="block">
              <h2 className="font-semibold hover:underline">{product.title}</h2>
            </Link>
            {product.description && (
              <p className="text-sm text-gray-500 line-clamp-2">
                {product.description}
              </p>
            )}
            <p className="text-sm text-gray-500">
              {product.variants[0]
                ? `₦${(product.variants[0].price / 100).toLocaleString()}`
                : "No price set"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/products/${product.id}`}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                View details
              </Link>
              <form action={addToCart.bind(null, product.id, product.variants[0]?.id)}>
                <button
                  disabled={!product.variants[0] || (product.variants[0].inventory?.quantity ?? 0) <= 0}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add to cart
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
