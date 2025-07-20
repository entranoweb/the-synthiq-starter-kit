import "next-auth";
import { DefaultSession } from "next-auth";
import { userRoleEnum } from "../lib/db/enums";

type UserRole = (typeof userRoleEnum.enumValues)[number];

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      createdAt: Date;
      stripeProductId?: string | null;
      membershipStatus?: string | null;
      tokens: number;
      tokensExpiresAt?: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    createdAt: Date;
    stripeProductId?: string | null;
    membershipStatus?: string | null;
    tokens: number;
    tokensExpiresAt?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    stripeProductId?: string | null;
    membershipStatus?: string | null;
    tokens: number;
    tokensExpiresAt?: Date | null;
  }
}

declare global {
  interface Window {
    Stripe: any;
  }
}
