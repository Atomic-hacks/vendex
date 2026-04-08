/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const addToCartSchema = z.object({
  productId: z.string().trim().min(1).optional(),
  variantId: z.string().trim().min(1).optional(),
  quantity: z.number().int().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = addToCartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid request body",
        },
        { status: 400 },
      );
    }

    const { productId, variantId, quantity } = parsed.data;

    if (!productId && !variantId) {
      return NextResponse.json(
        {
          error: "quantity and either variantId or productId are required",
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const cart =
          (await tx.cart.findUnique({ where: { userId } })) ??
          (await tx.cart.create({ data: { userId } }));

        const variant = variantId
          ? await tx.productVariant.findFirst({
              where: {
                id: variantId,
                product: {
                  status: "PUBLISHED",
                  ...(productId ? { id: productId } : {}),
                },
              },
              include: {
                product: true,
                inventory: true,
              },
            })
          : await tx.productVariant.findFirst({
              where: {
                productId,
                product: {
                  status: "PUBLISHED",
                },
              },
              include: {
                product: true,
                inventory: true,
              },
              orderBy: {
                price: "asc",
              },
            });

        if (!variant) throw new Error("Variant not found");

        const stock = variant.inventory?.quantity ?? 0;
        if (quantity > stock) throw new Error("Not enough stock");

        const existing = await tx.cartItem.findUnique({
          where: {
            cartId_variantId: {
              cartId: cart.id,
              variantId: variant.id,
            },
          },
        });

        const nextQty = (existing?.quantity ?? 0) + quantity;
        if (nextQty > stock)
          throw new Error("Not enough stock for total cart quantity");

        const cartItem = existing
          ? await tx.cartItem.update({
              where: { id: existing.id },
              data: {
                quantity: nextQty,
                priceSnapshot: variant.price,
              },
            })
          : await tx.cartItem.create({
              data: {
                cartId: cart.id,
                productId: variant.productId,
                variantId: variant.id,
                quantity,
                priceSnapshot: variant.price,
              },
            });

        return { cartId: cart.id, cartItem };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    return NextResponse.json(
      { message: "Added to cart", ...result },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add to cart" },
      { status: 400 },
    );
  }
}
