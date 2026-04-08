"use client";

import { useState } from "react";

// ─── Types matching what the API returns ───────────────────────────
type OptionValue = { id: string; value: string };
type Option = { id: string; name: string; values: OptionValue[] };
type Variant = {
  id: string;
  sku: string;
  price: number; // stored as integer (kobo/pence), display ÷100
  inventory: { quantity: number } | null;
  values: { value: OptionValue }[];
};

interface Props {
  productId: string;
  initialOptions?: Option[];
  initialVariants?: Variant[];
}

export function VariantBuilder({
  productId,
  initialOptions = [],
  initialVariants = [],
}: Props) {
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [newOptionName, setNewOptionName] = useState("");
  const [newValues, setNewValues] = useState<Record<string, string>>({}); // optionId → input value
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 1. Create an option (e.g. "Size") ──────────────────────────
  async function handleAddOption() {
    if (!newOptionName.trim()) return;
    setLoading(true);
    setError(null);
    console.log("[VariantBuilder] adding option:", newOptionName);

    const res = await fetch(`/api/products/${productId}/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOptionName.trim() }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[VariantBuilder] option create failed:", err);
      setError(err.error ?? "Failed to create option");
      setLoading(false);
      return;
    }

    const option: Option = await res.json();
    console.log("[VariantBuilder] option created:", option.id);
    setOptions((prev) => [...prev, option]);
    setNewOptionName("");
    setLoading(false);
  }

  // ── 2. Add a value to an existing option (e.g. "Large") ────────
  async function handleAddValue(optionId: string) {
    const value = newValues[optionId]?.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    console.log(
      "[VariantBuilder] adding value:",
      value,
      "to option:",
      optionId,
    );

    const res = await fetch(
      `/api/products/${productId}/options/${optionId}/values`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      console.error("[VariantBuilder] value create failed:", err);
      setError(err.error ?? "Failed to add value");
      setLoading(false);
      return;
    }

    const newVal: OptionValue = await res.json();
    console.log("[VariantBuilder] value created:", newVal.id);

    // Merge the new value into the correct option in state
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optionId ? { ...o, values: [...o.values, newVal] } : o,
      ),
    );
    setNewValues((prev) => ({ ...prev, [optionId]: "" }));
    setLoading(false);
  }

  // ── 3. Generate variant combinations ───────────────────────────
  // Cartesian product: [["S","M"], ["Red","Blue"]] → [["S","Red"],["S","Blue"],...]
  function cartesian(arrays: OptionValue[][]): OptionValue[][] {
    return arrays.reduce<OptionValue[][]>(
      (acc, curr) => acc.flatMap((combo) => curr.map((val) => [...combo, val])),
      [[]],
    );
  }

  async function handleGenerateVariants() {
    const allValues = options.map((o) => o.values);
    if (variants.length > 0) {
      setError(
        "Variants already exist for this product. Update the existing variants instead of regenerating them.",
      );
      return;
    }
    if (allValues.some((v) => v.length === 0)) {
      setError(
        "Each option needs at least one value before generating variants",
      );
      return;
    }

    const combinations = cartesian(allValues);
    console.log("[VariantBuilder] generating", combinations.length, "variants");
    setLoading(true);
    setError(null);

    const created: Variant[] = [];

    for (const combo of combinations) {
      // SKU = productId prefix + value initials e.g. "prod_abc-S-RED"
      const sku = `${productId.slice(-6)}-${combo.map((v) => v.value.slice(0, 3).toUpperCase()).join("-")}`;

      const res = await fetch(`/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          price: 0, // vendor sets price after generation
          quantity: 0, // vendor sets stock after generation
          valueIds: combo.map((v) => v.id),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("[VariantBuilder] variant create failed:", err);
        setError(err.error ?? "Failed to generate variant");
        setLoading(false);
        return;
      }

      const variant: Variant = await res.json();
      console.log("[VariantBuilder] variant created:", variant.id, sku);
      created.push(variant);
    }

    setVariants(created);
    setLoading(false);
  }

  // ── 4. Update price or qty for a single variant ─────────────────
  async function handleVariantUpdate(
    variantId: string,
    field: "price" | "quantity",
    rawValue: string,
  ) {
    const parsed = parseFloat(rawValue);
    if (isNaN(parsed)) return;

    console.log("[VariantBuilder] updating variant:", variantId, field, parsed);

    const res = await fetch(
      `/api/products/${productId}/variants/${variantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsed }),
      },
    );

    if (!res.ok) {
      console.error("[VariantBuilder] variant update failed");
      setError("Failed to update variant");
    } else {
      console.log("[VariantBuilder] variant updated:", variantId);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}

      {/* ── Step 1: Options ── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-lg">1. Add Options</h2>
        <p className="text-sm text-gray-500">
          Options are attributes like &quot;Size&quot; or &quot;Color&quot;.
        </p>

        <div className="flex gap-2">
          <input
            value={newOptionName}
            onChange={(e) => setNewOptionName(e.target.value)}
            placeholder="e.g. Size"
            className="border rounded px-3 py-2 flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
          />
          <button
            onClick={handleAddOption}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Add Option
          </button>
        </div>

        {/* Render each option + its value inputs */}
        {options.map((option) => (
          <div key={option.id} className="border rounded p-4 space-y-3">
            <p className="font-medium">{option.name}</p>

            {/* Existing values */}
            <div className="flex flex-wrap gap-2">
              {option.values.map((v) => (
                <span
                  key={v.id}
                  className="bg-gray-100 text-sm px-2 py-1 rounded"
                >
                  {v.value}
                </span>
              ))}
            </div>

            {/* Add a new value */}
            <div className="flex gap-2">
              <input
                value={newValues[option.id] ?? ""}
                onChange={(e) =>
                  setNewValues((prev) => ({
                    ...prev,
                    [option.id]: e.target.value,
                  }))
                }
                placeholder={`Add a ${option.name} value`}
                className="border rounded px-3 py-2 flex-1 text-sm"
                onKeyDown={(e) =>
                  e.key === "Enter" && handleAddValue(option.id)
                }
              />
              <button
                onClick={() => handleAddValue(option.id)}
                disabled={loading}
                className="text-sm border px-3 py-2 rounded disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ── Step 2: Generate Variants ── */}
      {options.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold text-lg">2. Generate Variants</h2>
          <p className="text-sm text-gray-500">
            This creates every combination of your options automatically.
          </p>

          <button
            onClick={handleGenerateVariants}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Variants"}
          </button>

          {/* ── Step 3: Set price + stock per variant ── */}
          {variants.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">3. Set Price & Stock</h3>
              <p className="text-sm text-gray-500">
                Changes save automatically on blur.
              </p>

              {variants.map((variant) => {
                const label = variant.values
                  .map((v) => v.value.value)
                  .join(" / ");

                return (
                  <div
                    key={variant.id}
                    className="flex items-center gap-4 border rounded px-4 py-3"
                  >
                    <span className="flex-1 text-sm font-medium">{label}</span>

                    <label className="text-sm text-gray-500">Price</label>
                    <input
                      type="number"
                      defaultValue={(variant.price / 100).toFixed(2)}
                      min={0}
                      step={0.01}
                      className="border rounded px-2 py-1 w-24 text-sm"
                      // Save on blur — avoids an API call on every keystroke
                      onBlur={(e) =>
                        handleVariantUpdate(variant.id, "price", e.target.value)
                      }
                    />

                    <label className="text-sm text-gray-500">Stock</label>
                    <input
                      type="number"
                      defaultValue={variant.inventory?.quantity ?? 0}
                      min={0}
                      className="border rounded px-2 py-1 w-20 text-sm"
                      onBlur={(e) =>
                        handleVariantUpdate(
                          variant.id,
                          "quantity",
                          e.target.value,
                        )
                      }
                    />

                    <span className="text-xs text-gray-400 font-mono">
                      {variant.sku}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
