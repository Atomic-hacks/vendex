/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { checkout } from "../../services/checkout";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const order = await checkout(userId);

    return NextResponse.json(
      { message: "Checkout successful", order },
      { status: 200 }
    );
  } catch (error: any) {
    const message = error?.message || "Checkout failed";
    const isTransactionTimeout = message.includes(
      "Unable to start a transaction in the given time"
    );

    return NextResponse.json(
      { error: message },
      { status: isTransactionTimeout ? 503 : 400 }
    );
  }
}
