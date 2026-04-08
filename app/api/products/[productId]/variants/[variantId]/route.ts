import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// PATCH — update price or inventory quantity
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string; variantId: string }> },
) {
  const { productId, variantId } = await params;

  console.log("[VARIANT PATCH] hit", { productId, variantId });

  const session = await auth();
  if (!session?.user || session.user.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const variant = await prisma.productVariant.findFirst({
    where: {
      id: variantId,
      productId,
      product: { vendorId: session.user.vendorId! },
    },
    include: {
      product: {
        select: {
          vendor: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!variant) {
    console.warn("[VARIANT PATCH] not found");
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const price = body?.price;
  const quantity = body?.quantity;

  console.log("[VARIANT PATCH] updating:", { price, quantity });

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      ...(price != null && {
        price: Math.round(price * 100),
      }),
      ...(quantity != null && {
        inventory: {
          upsert: {
            create: { quantity },
            update: { quantity },
          },
        },
      }),
    },
    include: {
      inventory: true,
    },
  });

  revalidatePath(`/vendor/products/${productId}`);
  revalidatePath("/vendor/products");
  revalidatePath("/marketplace");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/store/${variant.product.vendor.slug}`);

  console.log("[VARIANT PATCH] updated:", updated.id);

  return NextResponse.json(updated);
}

// DELETE — remove variant (safe guard against order history)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ productId: string; variantId: string }> },
) {
  const { productId, variantId } = await params;

  console.log("[VARIANT DELETE] hit", { productId, variantId });

  const session = await auth();
  if (!session?.user || session.user.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const variant = await prisma.productVariant.findFirst({
    where: {
      id: variantId,
      productId,
      product: { vendorId: session.user.vendorId! },
    },
    include: {
      orderItems: { take: 1 },
      product: {
        select: {
          vendor: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!variant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (variant.orderItems.length > 0) {
    console.warn("[VARIANT DELETE] blocked due to order history");
    return NextResponse.json(
      { error: "Cannot delete a variant with order history" },
      { status: 409 },
    );
  }

  await prisma.productVariant.delete({
    where: { id: variantId },
  });

  revalidatePath(`/vendor/products/${productId}`);
  revalidatePath("/vendor/products");
  revalidatePath("/marketplace");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/store/${variant.product.vendor.slug}`);

  console.log("[VARIANT DELETE] deleted:", variantId);

  return NextResponse.json({ success: true });
}
