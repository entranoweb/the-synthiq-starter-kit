import { pgEnum } from "drizzle-orm/pg-core";

// User Roles
export const userRoleEnum = pgEnum("user_role", ["USER", "PREMIUM", "ADMIN", "BANNED"]);

// Membership Status
export const membershipStatusEnum = pgEnum("membership_status", [
  "ACTIVE",
  "INACTIVE", 
  "CANCELED",
  "PAST_DUE"
]);
