/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators/api";

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
    const exists = await prisma.vendorProfile.findUnique({ where: { slug: attempt } });
    if (!exists) return attempt;
    i++;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 },
      );
    }

    const { email, password, name, role, storeName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: name ?? null,
          passwordHash,
          role, // permanent at signup
        },
      });

      if (role === "VENDOR") {
        const slug = await generateUniqueSlug(storeName!);
        await tx.vendorProfile.create({
          data: {
            userId: created.id,
            storeName: storeName!,
            slug,
            status: "APPROVED",
          },
        });
      }

      return created;
    });

    return NextResponse.json({ message: "Signup ok", userId: user.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Signup failed" }, { status: 400 });
  }
}
