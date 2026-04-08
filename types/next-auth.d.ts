// types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    vendorId: string | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      vendorId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    vendorId?: string | null;
    lastChecked?: number;
  }
}

// ← Add this — extends the AdapterUser with your custom fields
declare module "next-auth/adapters" {
  interface AdapterUser {
    role: Role;
    vendorId: string | null;
  }
}
