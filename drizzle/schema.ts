import { pgTable, pgEnum, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['USER', 'PREMIUM', 'ADMIN', 'BANNED']);
export const membershipStatus = pgEnum('membership_status', [
  'ACTIVE',
  'INACTIVE',
  'CANCELED',
  'PAST_DUE',
]);

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  role: userRole('role').default('USER'),
  organizationId: text('organization_id').references(() => organizations.id),
  stripeProductId: text('stripe_product_id'),
  membershipStatus: membershipStatus('membership_status').default('ACTIVE'),
  tokens: integer('tokens').default(0),
  tokensExpiresAt: timestamp('tokens_expires_at'),
});

export const stripeProducts = pgTable('stripe_products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const stripePrices = pgTable('stripe_prices', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => stripeProducts.id),
});

export const userSubscriptions = pgTable('user_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  productId: text('product_id').references(() => stripeProducts.id),
  priceId: text('price_id').references(() => stripePrices.id),
  status: text('status'),
});

export const schema = {
  users,
  organizations,
  stripeProducts,
  stripePrices,
  userSubscriptions,
};
