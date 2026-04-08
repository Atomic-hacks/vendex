"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type OptionValue = {
  id: string;
  value: string;
};

type VariantOption = {
  id: string;
  name: string;
  values: OptionValue[];
};

type ProductVariant = {
  id: string;
  sku: string;
  price: number;
  inventory: { quantity: number } | null;
  values: {
    value: {
      id: string;
      value: string;
      option: {
        id: string;
        name: string;
      };
    };
  }[];
};

export function ProductPurchasePanel({
  productId,
  options,
  variants,
}: {
  productId: string;
  options: VariantOption[];
  variants: ProductVariant[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        options.map((option) => [option.id, option.values[0]?.id ?? ""]),
      ),
  );
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedVariant = useMemo(() => {
    if (options.length === 0) {
      return variants[0] ?? null;
    }

    return (
      variants.find((variant) => {
        const selectedIds = Object.values(selectedValues).filter(Boolean);
        if (selectedIds.length !== options.length) return false;

        const variantValueIds = variant.values.map((entry) => entry.value.id);
        return selectedIds.every((valueId) => variantValueIds.includes(valueId));
      }) ?? null
    );
  }, [options, selectedValues, variants]);

  const stock = selectedVariant?.inventory?.quantity ?? 0;
  const canBuy = !!selectedVariant && stock > 0;

  async function addSelectedVariantToCart() {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    if (!selectedVariant) {
      setError("Please choose a valid variant combination");
      return;
    }

    if (quantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          variantId: selectedVariant.id,
          quantity,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Failed to add item to cart");
        return;
      }

      router.push("/cart");
      router.refresh();
    });
  }

  return (
    <div className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.4)]">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-700">
        Purchase
      </p>

      <div className="mt-4 space-y-5">
        {options.map((option) => (
          <div key={option.id} className="space-y-2">
            <label className="text-sm font-semibold text-slate-800">
              {option.name}
            </label>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = selectedValues[option.id] === value.id;

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() =>
                      setSelectedValues((current) => ({
                        ...current,
                        [option.id]: value.id,
                      }))
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {value.value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.25rem] bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Selected price
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {selectedVariant
                ? `₦${(selectedVariant.price / 100).toLocaleString()}`
                : "Unavailable"}
            </p>
          </div>

          <div className="rounded-[1.25rem] bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Stock
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">{stock}</p>
          </div>
        </div>

        {selectedVariant && (
          <p className="text-sm text-slate-500">SKU {selectedVariant.sku}</p>
        )}

        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Quantity
          <input
            type="number"
            min={1}
            max={Math.max(stock, 1)}
            value={quantity}
            onChange={(event) =>
              setQuantity(Math.max(1, Number(event.target.value) || 1))
            }
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={addSelectedVariantToCart}
          disabled={!canBuy || pending}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Adding..." : canBuy ? "Add selected variant to cart" : "Unavailable"}
        </button>

        {!session?.user && (
          <p className="text-sm text-slate-500">
            You will be asked to sign in before you can buy.{" "}
            <Link href="/login" className="font-semibold text-orange-700">
              Go to login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
