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
        if (!payment) throw new Error("Payment record not found for this order");

        if (payment.status === "SUCCESS") {
          // idempotent: calling confirm twice shouldn't break things
          return {
            payment,
            order: await tx.order.findUnique({ where: { id: orderId } }),
          };
        }

        // mark payment success
        const updatedPayment = await tx.payment.update({
          where: { orderId },
          data: { status: "SUCCESS" },
        });

        // mark order paid
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: "PAID" },
        });

        return { payment: updatedPayment, order: updatedOrder };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      }
    );

    return NextResponse.json(
      { message: "Payment confirmed", ...result },
      { status: 200 }
    );
  } catch (error: any) {
    const message = error?.message || "Payment confirmation failed";
    const isTransactionTimeout = message.includes(
      "Unable to start a transaction in the given time"
    );

    return NextResponse.json(
      { error: message },
      { status: isTransactionTimeout ? 503 : 400 }
    );
  }
}
