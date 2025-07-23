import { betterAuth } from "better-auth";
import { stripe } from "@better-auth/stripe";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import Stripe from "stripe";
import { db } from "./db";
import * as schema from "./db/schema";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
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
    cookieName: "better-auth.session-token", // BetterAuth session cookie
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    fields: {
      expiresAt: "expires", // Map existing `expires` field to BetterAuth's `expiresAt`
      token: "sessionToken" // Map existing `sessionToken` field to BetterAuth's `token`
    }
  },
  account: {
    fields: {
      accountId: "providerAccountId",
      refreshToken: "refresh_token",
      accessToken: "access_token", 
      accessTokenExpiresAt: "expires_at",
      idToken: "id_token",
    }
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
          
          if (tokens > 0) {
            try {
              // Import here to avoid circular dependency
              const { db } = await import("./db");
              const { users } = await import("./db/schema");
              const { eq } = await import("drizzle-orm");
              
              // Update user tokens in database
              await db.update(users)
                .set({ 
                  tokens,
                  tokensExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                })
                .where(eq(users.id, user.id));
              
              console.log(`✅ Allocated ${tokens} tokens to user ${user.id}`);
            } catch (error) {
              console.error(`❌ Failed to allocate tokens to user ${user.id}:`, error);
            }
          }
        },
      },
    }),
  ],
});

// Export the handler for API routes
export const { handler } = auth;
export const GET = handler;
export const POST = handler;

// For server-side session handling
export const getSession = auth.api.getSession;
export const { api } = auth;
