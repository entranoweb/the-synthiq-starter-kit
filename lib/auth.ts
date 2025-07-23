import { betterAuth } from "better-auth";
import { stripe } from "@better-auth/stripe";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import Stripe from "stripe";
import { db } from "./db";
import * as schema from "./db/schema";
// Import our existing subscription logic
import { getUserSubscription, getUserTokens, updateUserTokens } from "./subscription";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {

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
  // ✅ Use database sessions for better security and session management
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieName: 'better-auth.session-token', // Fixed cookie name
  },
  // ✅ Security configuration
  trustedOrigins: [
    "http://localhost:3000",
    "https://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[],
  // ✅ Remove custom account mapping - let BetterAuth handle it
  // account field mapping removed - using defaults
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
        onSubscriptionCreated: async ({ product, user }: { product: any; user: any }) => {
          // ✅ Use existing subscription logic instead of inline code
          try {
            await updateUserTokens(user.id, product.id);
            console.log(`✅ Subscription created and tokens allocated for user ${user.id}`);
          } catch (error) {
            console.error(`❌ Failed to handle subscription creation for user ${user.id}:`, error);
          }
        },
      },
    }),
    // ✅ Add Next.js cookie handling - must be last plugin
    nextCookies(),
  ],
  // ✅ Session callbacks to include subscription data
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      try {
        // Extend session with subscription and token data
        const [subscription, tokens] = await Promise.all([
          getUserSubscription(user.id, false), // Don't auto-sync here to avoid performance issues
          getUserTokens(user.id)
        ]);
        
        session.user.subscription = subscription;
        session.user.tokens = tokens.tokens;
        session.user.tokensExpired = tokens.expired;
        session.user.role = user.role;
        
        return session;
      } catch (error) {
        console.error('Error extending session:', error);
        return session; // Return basic session if extension fails
      }
    },
  },
});

// Clean exports following Clinwell pattern
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// For server-side session handling - make getSession the default export to fix imports
const getSession = auth.api.getSession;
export default getSession;
export { getSession };

// Export API and handler for other uses (auth is already exported by the const declaration above)
export const { api, handler } = auth;
export const GET = handler;
export const POST = handler;
