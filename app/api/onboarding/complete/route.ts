/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/validators/api";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueSlug(base: string) {
  let slug = slugify(base);
  if (!slug) slug = "store";

  let i = 0;
  while (true) {
    const attempt = i === 0 ? slug : `${slug}-${i + 1}`;
    const exists = await prisma.vendorProfile.findUnique({
      where: { slug: attempt },
    });
    if (!exists) return attempt;
    i++;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const body = await req.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { role, storeName } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.role !== "UNSET") {
    return NextResponse.json({ error: "Role already set" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role } });

    if (role === "VENDOR") {
      const slug = await generateUniqueSlug(storeName!);
      await tx.vendorProfile.create({
        data: { userId, storeName: storeName!, slug, status: "APPROVED" },
      });
    }
  });

  return NextResponse.json({ message: "Onboarding complete" }, { status: 200 });
}
