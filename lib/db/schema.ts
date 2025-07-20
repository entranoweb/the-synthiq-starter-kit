import { pgTable, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { userRoleEnum, membershipStatusEnum } from "./enums";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verificationtokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("USER"),
  stripeProductId: text("stripe_product_id"),
  membershipStatus: membershipStatusEnum("membership_status").notNull().default("ACTIVE"),
  tokens: integer("tokens").notNull().default(0),
  tokensExpiresAt: timestamp("tokens_expires_at", { withTimezone: true }),
  organizationId: text("organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stripeProducts = pgTable("stripe_products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stripePrices = pgTable("stripe_prices", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  active: boolean("active").notNull().default(true),
  currency: text("currency").notNull(),
  type: text("type").notNull(), // one_time, recurring
  unitAmount: integer("unit_amount"), // Amount in cents
  interval: text("interval"), // month, year
  intervalCount: integer("interval_count"),
  trialPeriodDays: integer("trial_period_days"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Stripe Customers
export const stripeCustomers = pgTable("stripe_customers", {
  id: text("id").primaryKey(),
  userId: text("user_id").unique().notNull(),
  stripeCustomerId: text("stripe_customer_id").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// User Subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique().notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeProductId: text("stripe_product_id").notNull(),
  status: text("status").notNull(), // active, canceled, incomplete, past_due
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  trialStart: timestamp("trial_start", { withTimezone: true }),
  trialEnd: timestamp("trial_end", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Payment History
export const paymentHistory = pgTable("payment_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  stripeProductId: text("stripe_product_id"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokenRelations = relations(verificationTokens, () => ({}));

export const userRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  subscriptions: many(userSubscriptions),
  customer: one(stripeCustomers, { fields: [users.id], references: [stripeCustomers.userId] }),
  stripeProduct: one(stripeProducts, { fields: [users.stripeProductId], references: [stripeProducts.id] }),
  paymentHistory: many(paymentHistory),
  organization: one(organizations, { fields: [users.organizationId], references: [organizations.id] }),
}));

export const stripeProductRelations = relations(stripeProducts, ({ many }) => ({
  prices: many(stripePrices),
  users: many(users),
  subscriptions: many(userSubscriptions),
  paymentHistory: many(paymentHistory),
}));

export const stripePriceRelations = relations(stripePrices, ({ many, one }) => ({
  product: one(stripeProducts, { fields: [stripePrices.productId], references: [stripeProducts.id] }),
  subscriptions: many(userSubscriptions),
}));

export const stripeCustomerRelations = relations(stripeCustomers, ({ many, one }) => ({
  user: one(users, { fields: [stripeCustomers.userId], references: [users.id] }),
  subscriptions: many(userSubscriptions),
}));

export const userSubscriptionRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, { fields: [userSubscriptions.userId], references: [users.id] }),
  stripeCustomer: one(stripeCustomers, { fields: [userSubscriptions.stripeCustomerId], references: [stripeCustomers.id] }),
  stripePrice: one(stripePrices, { fields: [userSubscriptions.stripePriceId], references: [stripePrices.id] }),
  stripeProduct: one(stripeProducts, { fields: [userSubscriptions.stripeProductId], references: [stripeProducts.id] }),
}));

export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  user: one(users, { fields: [paymentHistory.userId], references: [users.id] }),
  stripeProduct: one(stripeProducts, { fields: [paymentHistory.stripeProductId], references: [stripeProducts.id] }),
}));

export const organizationRelations = relations(organizations, ({ many }) => ({
  users: many(users),
}));

export {
  accounts,
  sessions,
  verificationTokens,
  users,
  stripeProducts,
  stripePrices,
  stripeCustomers,
  userSubscriptions,
  paymentHistory,
  organizations,
  accountRelations,
  sessionRelations,
  verificationTokenRelations,
  userRelations,
  stripeProductRelations,
  stripePriceRelations,
  stripeCustomerRelations,
  userSubscriptionRelations,
  paymentHistoryRelations,
  organizationRelations,
  userRoleEnum,
  membershipStatusEnum,
};
