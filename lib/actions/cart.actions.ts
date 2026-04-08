"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkout } from "@/app/services/checkout";

async function requireSignedInUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role === "UNSET") {
    redirect("/onboarding");
  }

  return session.user;
}

export async function addToCart(productId: string, variantId?: string) {
  const user = await requireSignedInUser();

  await prisma.$transaction(async (tx) => {
    const cart =
      (await tx.cart.findUnique({ where: { userId: user.id } })) ??
      (await tx.cart.create({ data: { userId: user.id } }));

    const variant = variantId
      ? await tx.productVariant.findFirst({
          where: {
            id: variantId,
            productId,
            product: {
              status: "PUBLISHED",
            },
          },
          include: {
            inventory: true,
          },
        })
      : (
          await tx.productVariant.findMany({
            where: {
              productId,
              product: {
                status: "PUBLISHED",
              },
            },
            include: {
              inventory: true,
            },
            orderBy: {
              price: "asc",
            },
          })
        ).find((candidate) => (candidate.inventory?.quantity ?? 0) > 0);

    if (!variant) {
      throw new Error("No purchasable variant available for this product");
    }

    const stock = variant.inventory?.quantity ?? 0;
    if (stock <= 0) {
      throw new Error("This item is out of stock");
    }

    const existing = await tx.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: variant.id,
        },
      },
    });

    const nextQty = (existing?.quantity ?? 0) + 1;
    if (nextQty > stock) {
      throw new Error("Not enough stock for more of this item");
    }

    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQty,
          priceSnapshot: variant.price,
        },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variant.id,
          quantity: 1,
          priceSnapshot: variant.price,
        },
      });
    }
  });

  revalidatePath("/cart");
  revalidatePath("/marketplace");
}

export async function incrementCartItem(itemId: string) {
  const user = await requireSignedInUser();

  await prisma.$transaction(async (tx) => {
    const item = await tx.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: user.id,
        },
      },
      include: {
        variant: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!item) {
      throw new Error("Cart item not found");
    }

    const stock = item.variant.inventory?.quantity ?? 0;
    if (item.quantity + 1 > stock) {
      throw new Error("Not enough stock");
    }

    await tx.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: {
          increment: 1,
        },
        priceSnapshot: item.variant.price,
      },
    });
  });

  revalidatePath("/cart");
}

export async function decrementCartItem(itemId: string) {
  const user = await requireSignedInUser();

  await prisma.$transaction(async (tx) => {
    const item = await tx.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: user.id,
        },
      },
    });

    if (!item) {
      throw new Error("Cart item not found");
    }

    if (item.quantity <= 1) {
      await tx.cartItem.delete({
        where: { id: itemId },
      });
      return;
    }

    await tx.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: {
          decrement: 1,
        },
      },
    });
  });

  revalidatePath("/cart");
}

export async function removeCartItem(itemId: string) {
  const user = await requireSignedInUser();

  const deleted = await prisma.cartItem.deleteMany({
    where: {
      id: itemId,
      cart: {
        userId: user.id,
      },
    },
  });

  if (deleted.count === 0) {
    throw new Error("Cart item not found");
  }

  revalidatePath("/cart");
}

export async function checkoutCart() {
  const user = await requireSignedInUser();
  const order = await checkout(user.id);

  revalidatePath("/cart");
  revalidatePath("/orders");
  redirect(`/orders?highlight=${order.id}`);
}
