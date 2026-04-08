import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCartByUserId } from "@/lib/queries/cart";
import {
  checkoutCart,
  decrementCartItem,
  incrementCartItem,
  removeCartItem,
} from "@/lib/actions/cart.actions";

function formatMoney(amount: number) {
  return `₦${(amount / 100).toLocaleString()}`;
}

function variantLabel(values: { value: { value: string } }[]) {
  if (values.length === 0) return "Default variant";
  return values.map((entry) => entry.value.value).join(" / ");
}

export default async function CartPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const cart = await getCartByUserId(session.user.id);
  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.priceSnapshot * item.quantity,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <section className="flex flex-col gap-3 rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-700">
          Your cart
        </p>
        <h1 className="text-3xl font-black text-slate-950">
          Review your items before checkout.
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          This is the first buyer-facing checkpoint for the MVP: adjust
          quantities, remove items, and create an order from the current cart.
        </p>
      </section>

      {items.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">
            Your cart is empty.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Browse the marketplace and add a product to start the checkout flow.
          </p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Continue shopping
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="space-y-4">
            {items.map((item) => {
              const stock = item.variant.inventory?.quantity ?? 0;

              return (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-slate-950">
                        {item.product.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.product.vendor.storeName}
                      </p>
                      <p className="text-sm text-slate-600">
                        {variantLabel(item.variant.values)}
                      </p>
                      <p className="text-sm text-slate-500">SKU {item.variant.sku}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-black text-slate-950">
                        {formatMoney(item.priceSnapshot)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {stock} left in stock
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <form action={decrementCartItem.bind(null, item.id)}>
                        <button className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                          -
                        </button>
                      </form>
                      <span className="min-w-10 text-center text-sm font-semibold text-slate-900">
                        {item.quantity}
                      </span>
                      <form action={incrementCartItem.bind(null, item.id)}>
                        <button className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                          +
                        </button>
                      </form>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Line total: {formatMoney(item.priceSnapshot * item.quantity)}
                      </p>
                      <form action={removeCartItem.bind(null, item.id)}>
                        <button className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="h-fit rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
              Summary
            </p>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span>{items.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment flow</span>
                <span>Mock</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Order total</p>
                <p className="text-2xl font-black text-slate-950">
                  {formatMoney(subtotal)}
                </p>
              </div>
            </div>

            <form action={checkoutCart} className="mt-6">
              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800">
                Create order and continue
              </button>
            </form>

            <Link
              href="/marketplace"
              className="mt-3 inline-flex text-sm font-semibold text-orange-700"
            >
              Add more items
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
