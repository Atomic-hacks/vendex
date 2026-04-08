/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PostAuthPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;

  if (role === "UNSET") redirect("/onboarding");
  if (role === "VENDOR") redirect("/vendor/dashboard");
  if (role === "ADMIN") redirect("/admin");
  if (role === "BUYER") redirect("/");
  redirect("/");
}
