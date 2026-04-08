"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

async function requireVendor() {
  const user = await requireSignedInUser();

  if (user.role !== "VENDOR" || !user.vendorId) {
    throw new Error("Vendor access required");
  }

  return user;
}

export async function confirmOrderPayment(orderId: string) {
  const user = await requireSignedInUser();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      include: {
        payment: true,
      },
    });

    if (!order?.payment) {
      throw new Error("Payment record not found");
    }

    if (order.payment.status === "SUCCESS") {
      return;
    }

    await tx.payment.update({
      where: { orderId },
      data: { status: "SUCCESS" },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
    });
  });

  revalidatePath("/orders");
  revalidatePath("/vendor/orders");
}

export async function failOrderPayment(orderId: string) {
  const user = await requireSignedInUser();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      include: {
        payment: true,
        items: true,
      },
    });

    if (!order?.payment) {
      throw new Error("Payment record not found");
    }

    if (order.payment.status === "SUCCESS") {
      throw new Error("Cannot fail a successful payment");
    }

    await tx.payment.update({
      where: { orderId },
      data: { status: "FAILED" },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAYMENT_FAILED" },
    });

    for (const item of order.items) {
      await tx.inventory.update({
        where: { variantId: item.variantId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }
  });

  revalidatePath("/orders");
  revalidatePath("/vendor/orders");
}

export async function shipVendorOrderItem(orderItemId: string) {
  const vendor = await requireVendor();

  await prisma.$transaction(async (tx) => {
    const orderItem = await tx.orderItem.findFirst({
      where: {
        id: orderItemId,
        vendorId: vendor.vendorId!,
      },
      include: {
        order: true,
      },
    });

    if (!orderItem) {
      throw new Error("Order item not found");
    }

    if (orderItem.order.status !== "PAID") {
      throw new Error("Order must be paid before shipping");
    }

    if (orderItem.status === "SHIPPED" || orderItem.status === "DELIVERED") {
      return;
    }

    await tx.orderItem.update({
      where: { id: orderItemId },
      data: { status: "SHIPPED" },
    });

    const items = await tx.orderItem.findMany({
      where: { orderId: orderItem.orderId },
      select: { status: true },
    });

    const allShipped = items.every(
      (item) => item.status === "SHIPPED" || item.status === "DELIVERED",
    );

    if (allShipped) {
      await tx.order.update({
        where: { id: orderItem.orderId },
        data: { status: "SHIPPED" },
      });
    }
  });

  revalidatePath("/vendor/orders");
  revalidatePath("/orders");
}

export async function confirmOrderDelivery(orderItemId: string) {
  const user = await requireSignedInUser();

  await prisma.$transaction(async (tx) => {
    const orderItem = await tx.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          userId: user.id,
        },
      },
      include: {
        order: true,
      },
    });

    if (!orderItem) {
      throw new Error("Order item not found");
    }

    if (orderItem.status !== "SHIPPED") {
      throw new Error("Item must be shipped before delivery confirmation");
    }

    await tx.orderItem.update({
      where: { id: orderItemId },
      data: { status: "DELIVERED" },
    });

    const items = await tx.orderItem.findMany({
      where: { orderId: orderItem.orderId },
      select: {
        vendorId: true,
        quantity: true,
        priceSnapshot: true,
        status: true,
      },
    });

    const allDelivered = items.every((item) => item.status === "DELIVERED");

    if (allDelivered) {
      await tx.order.update({
        where: { id: orderItem.orderId },
        data: { status: "DELIVERED" },
      });

      const earningsByVendor = new Map<string, number>();

      for (const item of items) {
        const gross = item.priceSnapshot * item.quantity;
        const vendorEarning = Math.floor(gross * 0.9);
        earningsByVendor.set(
          item.vendorId,
          (earningsByVendor.get(item.vendorId) ?? 0) + vendorEarning,
        );
      }

      for (const [vendorId, amount] of earningsByVendor.entries()) {
        await tx.vendorBalance.upsert({
          where: { vendorId },
          update: {
            available: {
              increment: amount,
            },
          },
          create: {
            vendorId,
            available: amount,
            pending: 0,
          },
        });
      }
    }
  });

  revalidatePath("/orders");
  revalidatePath("/vendor/orders");
}
