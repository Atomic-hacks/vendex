/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderItemId } = body as { orderItemId: string };

    if (!orderItemId) {
      return NextResponse.json(
        { error: "orderItemId is required" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const orderItem = await tx.orderItem.findUnique({
          where: { id: orderItemId },
          include: { order: true },
        });

        if (!orderItem) throw new Error("Order item not found");

        if (orderItem.status !== "SHIPPED") {
          throw new Error("Item must be shipped before delivery");
        }

        const updatedItem = await tx.orderItem.update({
          where: { id: orderItemId },
          data: { status: "DELIVERED" },
        });

        const items = await tx.orderItem.findMany({
          where: { orderId: orderItem.orderId },
        });

       const allDelivered = items.every((i) => i.status === "DELIVERED");

let updatedOrder = orderItem.order;

        if (allDelivered) {
  // 1) Mark order delivered
  updatedOrder = await tx.order.update({
    where: { id: orderItem.orderId },
    data: { status: "DELIVERED" },
  });

  // 2) Load all order items for earnings calculation
  const fullItems = await tx.orderItem.findMany({
    where: { orderId: orderItem.orderId },
    select: {
      vendorId: true,
      quantity: true,
      priceSnapshot: true,
    },
  });

  // 3) Group earnings per vendor
  const earningsByVendor = new Map<string, number>();
  for (const it of fullItems) {
    const gross = it.priceSnapshot * it.quantity;
    const vendorEarning = Math.floor(gross * 0.9); // vendor gets 90%
    earningsByVendor.set(
      it.vendorId,
      (earningsByVendor.get(it.vendorId) ?? 0) + vendorEarning
    );
  }

  // 4) Upsert VendorBalance for each vendor and add to available
          for (const [vendorId, amount] of earningsByVendor.entries()) {
            await tx.vendorBalance.upsert({
              where: { vendorId },
              update: { available: { increment: amount } },
              create: { vendorId, available: amount, pending: 0 },
            });
          }
        }

        return { updatedItem, updatedOrder };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    return NextResponse.json(
      { message: "Order item delivered", ...result },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Delivery failed" },
      { status: 400 },
    );
  }
}
