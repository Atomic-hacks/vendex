// app/api/auth/logout/route.ts
import { signOut } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  await signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL!));
}