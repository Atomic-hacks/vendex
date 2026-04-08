/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Adapter } from "next-auth/adapters";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
   adapter: PrismaAdapter(prisma) as Adapter,

  // JWT strategy — fast edge reads, adapter still writes to DB
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // sessions expire after 24 hours
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    Credentials({
      name: "Email & Password",
      credentials: { email: {}, password: {} },

      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { vendorProfile: { select: { id: true } } },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Whatever you return here gets passed into the jwt() callback
        // as the `user` argument — so include everything you need
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          vendorId: user.vendorProfile?.id ?? null,
        } as any;
      },
    }),
  ],

  callbacks: {
    // ─── JWT CALLBACK ────────────────────────────────────────────────
    // Runs when:
    //   1. User first signs in  (user object is present)
    //   2. Session is read      (user object is absent)
    // The token is what gets encrypted into the cookie.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "UNSET"; // role IS a column, safe
        token.vendorId = null; // always fetch from DB below
        token.lastChecked = 0; // force immediate DB check on first sign-in
      }
      // ... rest of callback unchanged

      // Subsequent requests — re-check DB every 5 minutes
      // This catches role changes, bans, vendor approval etc.
      const fiveMinutes = 5 * 60 * 1000;
      const due =
        !token.lastChecked ||
        Date.now() - (token.lastChecked as number) > fiveMinutes ||
        token.role === "UNSET";

      if (due && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            vendorProfile: { select: { id: true } },
          },
        });

        // User deleted or banned — invalidate session entirely
        if (!dbUser) return null as any;

        // Refresh role and vendorId from DB into token
        token.role = dbUser.role;
        token.vendorId = dbUser.vendorProfile?.id ?? null;
        token.lastChecked = Date.now();
      }

      return token;
    },

    // ─── SESSION CALLBACK ─────────────────────────────────────────────
    // Runs when your components call auth() or useSession()
    // Copies what's in the token into the session object your
    // app actually reads.
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).vendorId = token.vendorId;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login", // redirect to your custom login page
  },
});
