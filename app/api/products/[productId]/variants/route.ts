import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createVariantSchema = z.object({
  sku: z.string().trim().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(0),
  valueIds: z.array(z.string().min(1)).default([]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;

  const session = await auth();
  if (!session?.user || session.user.role !== "VENDOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      vendorId: session.user.vendorId!,
    },
    select: {
      id: true,
      vendor: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createVariantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { sku, price, quantity, valueIds } = parsed.data;

  const optionValues = valueIds.length
    ? await prisma.optionValue.findMany({
        where: {
          id: { in: valueIds },
          option: {
            productId,
          },
        },
        select: {
          id: true,
        },
      })
    : [];

  if (optionValues.length !== valueIds.length) {
    return NextResponse.json(
      { error: "Some option values do not belong to this product" },
      { status: 400 },
    );
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku,
      price: Math.round(price * 100),
      inventory: {
        create: {
          quantity,
        },
      },
      values: valueIds.length
        ? {
            create: valueIds.map((valueId) => ({
              valueId,
            })),
          }
        : undefined,
    },
    include: {
      inventory: true,
      values: {
        include: {
          value: true,
        },
      },
    },
  });

  revalidatePath(`/vendor/products/${productId}`);
  revalidatePath("/vendor/products");
  revalidatePath("/marketplace");
  revalidatePath(`/products/${productId}`);
  revalidatePath(`/store/${product.vendor.slug}`);

  return NextResponse.json(variant, { status: 201 });
}
