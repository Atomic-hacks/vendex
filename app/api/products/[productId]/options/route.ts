import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// POST — create a variant option e.g. { name: "Size" }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  console.log("[OPTIONS POST] hit", productId);

  const session = await auth();
  if (!session?.user || session.user.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      vendorId: session.user.vendorId!,
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name } = await req.json();

  console.log("[OPTIONS POST] creating option:", name);

  const option = await prisma.variantOption.create({
    data: {
      name,

      // ✅ FIX depends on your schema:
      product: {
        connect: { id: productId },
      },
    },
    include: {
      values: true,
    },
  });

  return NextResponse.json(option);
} 