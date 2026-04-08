/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shipOrderItemSchema } from "@/lib/validators/api";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = shipOrderItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 },
      );
    }

    const { vendorId, orderItemId } = parsed.data;

    const result = await prisma.$transaction(
      async (tx) => {
        // 1) Find the order item + its order
        const orderItem = await tx.orderItem.findUnique({
          where: { id: orderItemId },
          include: { order: true },
        });

        if (!orderItem) throw new Error("Order item not found");

        // 2) Must belong to the vendor
        if (orderItem.vendorId !== vendorId) {
          throw new Error("Not allowed: this order item is not yours");
        }

        // if order is already shipped, return early (idempotent)        
        if (orderItem.status === "SHIPPED") {
          return { updatedItem: orderItem, updatedOrder: orderItem.order };
        }

        // 3) Order must be paid
        if (orderItem.order.status !== "PAID") {
          throw new Error("Order is not paid, cannot ship");
        }

        // 4) Update the item to shipped (idempotent)
        const updatedItem = await tx.orderItem.update({
          where: { id: orderItemId },
          data: { status: "SHIPPED" },
        });

        // 5) If all items in the order are shipped, mark order shipped
        const items = await tx.orderItem.findMany({
          where: { orderId: orderItem.orderId },
          select: { status: true },
        });

        const allShipped = items.every((i) => i.status === "SHIPPED");

        const updatedOrder = allShipped
          ? await tx.order.update({
              where: { id: orderItem.orderId },
              data: { status: "SHIPPED" },
            })
          : orderItem.order; // keep as-is

        return { updatedItem, updatedOrder };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    return NextResponse.json(
      { message: "Order item shipped", ...result },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to ship order item" },
      { status: 400 },
    );
  }
}
