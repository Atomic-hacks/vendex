// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const { pathname } = req.nextUrl;
  const role = token?.role as string | undefined;
  const isLoggedIn = !!token;

  const isProtectedAuthPage = pathname === "/signup" || pathname === "/post-auth";

  if (isLoggedIn && isProtectedAuthPage && role && role !== "UNSET") {
    if (role === "VENDOR")
      return NextResponse.redirect(new URL("/vendor/dashboard", req.url));
    if (role === "ADMIN")
      return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isLoggedIn && role === "UNSET" && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (pathname.startsWith("/vendor") && (!isLoggedIn || role !== "VENDOR")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin") && (!isLoggedIn || role !== "ADMIN")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
