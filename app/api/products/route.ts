import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createProductSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    name: z.string().trim().min(2).max(120).optional(),
  })
  .refine((data) => data.title || data.name, {
    message: "title is required",
    path: ["title"],
  })
  .transform((data) => ({
    title: data.title ?? data.name!,
  }));

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      vendorProfile: true,
    },
  });

  if (!user?.vendorProfile) {
    return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const product = await prisma.product.create({
    data: {
      title: parsed.data.title,
      status: "DRAFT",
      vendorId: user.vendorProfile.id,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
