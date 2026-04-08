import { prisma } from "@/lib/prisma";

export async function checkout(userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  inventory: true,
                },
              },
              product: {
                include: {
                  vendor: true,
                },
              },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
      }

      for (const item of cart.items) {
        const product = item.product;
        const stock = item.variant.inventory?.quantity ?? 0;

        if (product.status !== "PUBLISHED") {
          throw new Error(`Product not available: ${product.title}`);
        }

        if (item.quantity > stock) {
          throw new Error(`Not enough stock for: ${product.title}`);
        }
      }

      const totalAmount = cart.items.reduce(
        (sum, item) => sum + item.priceSnapshot * item.quantity,
        0
      );

      const order = await tx.order.create({
        data: {
          userId,
          status: "CREATED",
          totalAmount,
        },
      });

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          vendorId: item.product.vendorId,
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
        })),
      });

      for (const item of cart.items) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: {
            quantity: { decrement: item.quantity },
          },
        });
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          provider: "mock",
        },
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    },
    {
      maxWait: 20_000,
      timeout: 40_000,
    }
  );
}
