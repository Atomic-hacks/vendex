import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getVendorOrderItems } from "@/lib/queries/orders";
import { shipVendorOrderItem } from "@/lib/actions/order.actions";

function formatMoney(amount: number) {
  return `₦${(amount / 100).toLocaleString()}`;
}

function variantLabel(values: { value: { value: string } }[]) {
  if (values.length === 0) return "Default variant";
  return values.map((entry) => entry.value.value).join(" / ");
}

export default async function VendorOrdersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "VENDOR" || !session.user.vendorId) {
    redirect("/onboarding");
  }

  const items = await getVendorOrderItems(session.user.vendorId);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-700">
          Vendor orders
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Fulfill paid items and track shipping progress.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This page turns the existing order APIs into an actual vendor workflow.
          Paid items can be marked as shipped, and buyers can later confirm
          delivery from their order history.
        </p>
      </section>

      {items.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">
            No order items yet.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const canShip =
              item.order.status === "PAID" && item.status === "PENDING";

            return (
              <article
                key={item.id}
                className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-slate-950">
                      {item.product.title}
                    </p>
                    <p className="text-sm text-slate-600">
                      {variantLabel(item.variant.values)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Buyer: {item.order.user.name ?? item.order.user.email}
                    </p>
                    <p className="text-sm text-slate-500">
                      Qty {item.quantity} x {formatMoney(item.priceSnapshot)}
                    </p>
                  </div>

                  <div className="space-y-2 text-right">
                    <p className="text-sm font-semibold text-slate-700">
                      Item: {item.status}
                    </p>
                    <p className="text-sm text-slate-500">
                      Order: {item.order.status}
                    </p>
                    <p className="text-sm text-slate-500">
                      Payment: {item.order.payment?.status ?? "NONE"}
                    </p>
                  </div>
                </div>

                {canShip && (
                  <form action={shipVendorOrderItem.bind(null, item.id)} className="mt-5">
                    <button className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                      Mark as shipped
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
