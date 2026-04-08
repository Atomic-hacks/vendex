import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST — add a value to an option e.g. { value: "Large" }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string; optionId: string }> }
) {
  const { productId, optionId } = await params;

  console.log("[VALUES POST] hit", { productId, optionId });

  const session = await auth();
  if (!session?.user || session.user.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // confirm product ownership first (safer)
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      vendorId: session.user.vendorId!,
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const option = await prisma.variantOption.findFirst({
    where: {
      id: optionId,
      productId,
    },
  });

  if (!option) {
    console.warn("[VALUES POST] option not found");
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const value = body?.value;

  if (!value) {
    return NextResponse.json(
      { error: "value is required" },
      { status: 400 }
    );
  }

  console.log("[VALUES POST] adding value:", value);

  const optionValue = await prisma.optionValue.create({
    data: {
      value,
      optionId,
    },
  });

  console.log("[VALUES POST] created:", optionValue.id);

  return NextResponse.json(optionValue);
}