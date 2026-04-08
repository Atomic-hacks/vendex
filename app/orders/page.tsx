import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBuyerOrders } from "@/lib/queries/orders";
import {
  confirmOrderDelivery,
  confirmOrderPayment,
  failOrderPayment,
} from "@/lib/actions/order.actions";

function formatMoney(amount: number) {
  return `₦${(amount / 100).toLocaleString()}`;
}

function variantLabel(values: { value: { value: string } }[]) {
  if (values.length === 0) return "Default variant";
  return values.map((entry) => entry.value.value).join(" / ");
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const orders = await getBuyerOrders(session.user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
          Buyer orders
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Track payment, shipping, and delivery from one place.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          New orders begin in a mock payment state. Confirm or fail payment here,
          then confirm delivery after the vendor ships the item.
        </p>
      </section>

      {orders.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">
            You have no orders yet.
          </p>
          <Link
            href="/marketplace"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Browse marketplace
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const highlighted = params.highlight === order.id;

            return (
              <section
                key={order.id}
                className={`rounded-[2rem] border bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)] ${
                  highlighted
                    ? "border-emerald-300"
                    : "border-black/5"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Order {order.id}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {order.status}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Payment: {order.payment?.status ?? "NONE"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">Total</p>
                    <p className="text-2xl font-black text-slate-950">
                      {formatMoney(order.totalAmount)}
                    </p>
                  </div>
                </div>

                {order.payment?.status === "PENDING" && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <form action={confirmOrderPayment.bind(null, order.id)}>
                      <button className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        Confirm payment
                      </button>
                    </form>
                    <form action={failOrderPayment.bind(null, order.id)}>
                      <button className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
                        Mark payment failed
                      </button>
                    </form>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {order.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[1.25rem] border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-bold text-slate-950">
                            {item.product.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.vendor.storeName}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {variantLabel(item.variant.values)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-700">
                            {item.status}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.quantity} x {formatMoney(item.priceSnapshot)}
                          </p>
                        </div>
                      </div>

                      {item.status === "SHIPPED" && (
                        <form
                          action={confirmOrderDelivery.bind(null, item.id)}
                          className="mt-4"
                        >
                          <button className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                            Confirm delivery
                          </button>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
