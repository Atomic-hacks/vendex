/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProductCategory, ProductStatus } from "@prisma/client";
import { z } from "zod";

// ─── helper: get the current vendor's ID or throw ───────────────────
async function requireVendor() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) throw new Error("Not a vendor");
  return vendorId as string;
}

const productDetailsSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.nativeEnum(ProductCategory),
  description: z.string().trim().max(4000).optional(),
  imageUrls: z.array(z.string().trim().url().max(1000)).max(8),
});

async function assertProductCanPublish(productId: string, vendorId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId },
    include: {
      variants: {
        include: {
          inventory: true,
          values: true,
        },
      },
      variantOptions: {
        include: {
          values: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (!product.title.trim()) {
    throw new Error("A product title is required before publishing");
  }

  if (!product.description?.trim()) {
    throw new Error("A product description is required before publishing");
  }

  if (product.imageUrls.length === 0) {
    throw new Error("Add at least one product image before publishing");
  }

  if (product.variants.length === 0) {
    throw new Error("Create at least one variant before publishing");
  }

  const hasPurchasableVariant = product.variants.some(
    (variant) => variant.price > 0 && (variant.inventory?.quantity ?? 0) > 0,
  );

  if (!hasPurchasableVariant) {
    throw new Error(
      "At least one variant must have a price above zero and stock above zero",
    );
  }

  const optionIds = new Set(product.variantOptions.map((option) => option.id));

  for (const variant of product.variants) {
    if (!variant.sku.trim()) {
      throw new Error("Every variant must have an SKU before publishing");
    }

    if (variant.price <= 0) {
      throw new Error("Every variant needs a price above zero before publishing");
    }

    const selectedOptionIds = new Set(
      variant.values.map((variantValue) => variantValue.valueId),
    );

    if (
      optionIds.size > 0 &&
      variant.values.length !== product.variantOptions.length
    ) {
      throw new Error(
        "Each variant must include one value from every product option before publishing",
      );
    }

    if (selectedOptionIds.size !== variant.values.length) {
      throw new Error("A variant contains duplicate option values");
    }
  }
}

async function getOwnedProduct(productId: string, vendorId: string) {
  return prisma.product.findFirst({
    where: { id: productId, vendorId },
    include: {
      vendor: {
        select: {
          slug: true,
        },
      },
    },
  });
}

export async function createProduct(formData: FormData) {
  const vendorId = await requireVendor();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "OTHER").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageUrls = String(formData.get("imageUrls") ?? "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  const parsed = productDetailsSchema.safeParse({
    title,
    category,
    description: description || undefined,
    imageUrls,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid product details");
  }

  // 1. Create the bare product shell — always starts as DRAFT
  const product = await prisma.product.create({
    data: {
      vendorId,
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      imageUrls: parsed.data.imageUrls,
      status: "DRAFT",
    },
  });

  // 2. Redirect to the edit page so they can add variants
  redirect(`/vendor/products/${product.id}`);
}

export async function updateProductDetails(productId: string, formData: FormData) {
  const vendorId = await requireVendor();

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "OTHER").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageUrls = String(formData.get("imageUrls") ?? "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  const parsed = productDetailsSchema.safeParse({
    title,
    category,
    description: description || undefined,
    imageUrls,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid product details");
  }

  const ownedProduct = await getOwnedProduct(productId, vendorId);

  if (!ownedProduct) {
    throw new Error("Product not found");
  }

  await prisma.product.update({
    where: {
      id: ownedProduct.id,
    },
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      imageUrls: parsed.data.imageUrls,
    },
  });

  revalidatePath(`/vendor/products/${productId}`);
  revalidatePath("/vendor/products");
  revalidatePath("/marketplace");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/store/${ownedProduct.vendor.slug}`);
}

type VariantOptionInput = {
  name: string;          // e.g. "Size"
  values: string[];      // e.g. ["S", "M", "L"]
};

type VariantInput = {
  sku: string;
  price: number;         // store in kobo/cents, never floats
  inventory: number;
  // which option values this variant maps to
  // e.g. { "Size": "M", "Color": "Red" }
  selectedValues: Record<string, string>;
};

export async function saveVariants(
  productId: string,
  options: VariantOptionInput[],
  variants: VariantInput[]
) {
  const vendorId = await requireVendor();

  // confirm this product belongs to this vendor
  const product = await getOwnedProduct(productId, vendorId);
  if (!product) throw new Error("Product not found");

  // wipe existing options/variants and rebuild — simplest approach
  // for a junior implementation. Advanced: diff and patch.
  await prisma.$transaction(async (tx:any) => {
    // delete old variants first (FK constraints)
    await tx.productVariant.deleteMany({ where: { productId } });
    await tx.variantOption.deleteMany({ where: { productId } });

    // recreate options and their values
    for (const opt of options) {
      await tx.variantOption.create({
        data: {
          productId,
          name: opt.name,
          values: {
            create: opt.values.map((v) => ({ value: v })),
          },
        },
      });
    }

    // fetch the newly created option values so we can look them up by name
    const freshOptions = await tx.variantOption.findMany({
      where: { productId },
      include: { values: true },
    });

    // build a lookup: { "Size": { "M": "optionValueId", ... } }
    const lookup: Record<string, Record<string, string>> = {};
    for (const opt of freshOptions) {
      lookup[opt.name] = {};
      for (const val of opt.values) {
        lookup[opt.name][val.value] = val.id;
      }
    }

    // create each variant + its inventory + its value links
    for (const v of variants) {
      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku: v.sku,
          price: v.price,
          inventory: {
            create: { quantity: v.inventory },
          },
        },
      });

      // link this variant to its option values
      for (const [optionName, valueName] of Object.entries(v.selectedValues)) {
        const valueId = lookup[optionName]?.[valueName];
        if (!valueId) continue;
        await tx.variantValue.create({
          data: { variantId: variant.id, valueId },
        });
      }
    }
  });

  revalidatePath(`/vendor/products/${productId}`);
  revalidatePath("/vendor/products");
  revalidatePath("/marketplace");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/store/${product.vendor.slug}`);
}

// Change status: "DRAFT" → "PUBLISHED" → "ARCHIVED"
export async function updateProductStatus(
  productId: string,
  status: ProductStatus
) {
  const vendorId = await requireVendor();
  const product = await getOwnedProduct(productId, vendorId);

  if (!product) {
    throw new Error("Product not found");
  }

  if (status === "PUBLISHED") {
    await assertProductCanPublish(productId, vendorId);
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { status },
  });

  revalidatePath("/vendor/products");
  revalidatePath(`/vendor/products/${productId}`);
  revalidatePath("/marketplace");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/store/${product.vendor.slug}`);
}

// Hard delete — only allow on DRAFT products
export async function deleteProduct(productId: string) {
  const vendorId = await requireVendor();

  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId },
  });

  if (!product) throw new Error("Not found");
  if (product.status !== "DRAFT") {
    throw new Error("Only draft products can be deleted");
  }

  await prisma.product.delete({ where: { id: productId } });
  redirect("/vendor/products");
}
