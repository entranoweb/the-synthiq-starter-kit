import { betterAuth } from "better-auth";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { db } from "./db";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieName: "next-auth.session-token", // Preserve existing sessions
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  plugins: [
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "basic",
            priceId: process.env.STRIPE_BASIC_PRICE_ID!,
            limits: { tokens: 100 },
          },
          {
            name: "pro",
            priceId: process.env.STRIPE_PRO_PRICE_ID!,
            limits: { tokens: 1000 },
            freeTrial: { days: 14 },
          },
        ],
      },
      events: {
        onSubscriptionCreated: async ({ product, user }) => {
          // Token allocation logic based on product metadata
          const tokens = Number(product.metadata.tokens ?? 0);
          // TODO: Update user tokens in database when Drizzle migration is complete
          console.log(`Allocating ${tokens} tokens to user ${user.id}`);
        },
      },
    }),
  ],
});

export const { GET, POST } = auth.handler;
