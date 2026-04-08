/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderIdSchema } from "@/lib/validators/api";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = orderIdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 },
      );
    }

    const { orderId } = parsed.data;

    const result = await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({ where: { orderId } });
        if (!payment)
          throw new Error("Payment record not found for this order");

        // If already succeeded, don't allow failing it (business rule)
        if (payment.status === "SUCCESS") {
          throw new Error("Cannot fail a successful payment");
        }

        // Load order + items (we need items to restock)
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });
        if (!order) throw new Error("Order not found");

        // Mark payment failed
        const updatedPayment = await tx.payment.update({
          where: { orderId },
          data: { status: "FAILED" },
        });

        // Mark order payment failed
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: "PAYMENT_FAILED" },
        });

        // Restock inventory based on order items
        for (const item of order.items) {
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { quantity: { increment: item.quantity } },
          });
        }

        return { payment: updatedPayment, order: updatedOrder };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    return NextResponse.json(
      { message: "Payment failed (restocked inventory)", ...result },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Payment failure handling failed" },
      { status: 400 },
    );
  }
}
