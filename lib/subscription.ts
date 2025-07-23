import { stripe } from "./stripe";
import { db } from "./db";
import { users, userSubscriptions, stripeProducts, stripePrices, stripeCustomers, userRoleEnum, membershipStatusEnum } from "./db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";

// Type aliases for compatibility
type UserRole = (typeof userRoleEnum.enumValues)[number];
type MembershipStatus = (typeof membershipStatusEnum.enumValues)[number];

// Constants for backward compatibility
const UserRoleEnum = {
  USER: 'USER' as const,
  PREMIUM: 'PREMIUM' as const,
  ADMIN: 'ADMIN' as const,
  BANNED: 'BANNED' as const
};

const MembershipStatusEnum = {
  ACTIVE: 'ACTIVE' as const,
  INACTIVE: 'INACTIVE' as const,
  CANCELED: 'CANCELED' as const,
  PAST_DUE: 'PAST_DUE' as const
};

// Cache for product sync to prevent frequent API calls
let productSyncCache = {
  lastSync: 0,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

export const syncUserStripeData = async (userId: string) => {
  try {
    const customer = await db.query.stripeCustomers.findFirst({
      where: eq(stripeCustomers.userId, userId),
    });

    if (!customer) return;

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.stripeCustomerId,
      limit: 10,
    });

    for (const subscription of subscriptions.data) {
      // TODO: replace with BetterAuth Stripe plugin webhook handling
      // await manageSubscriptionStatusChange(
      //   subscription.id,
      //   subscription.customer as string,
      //   false
      // );
    }

    console.log(`Synced data for user ${userId}`);
  } catch (error) {
    console.error('Sync failed:', error);
  }
};

export const syncStripeProductsAuto = async (force = false) => {
  const now = Date.now();
  
  // Check if we need to sync (only if cache expired or forced)
  if (!force && now - productSyncCache.lastSync < productSyncCache.cacheDuration) {
    console.log('Products sync skipped - using cached data');
    return;
  }

  try {
    console.log('🔄 Auto-syncing products from Stripe...');

    // Fetch all active products from Stripe
    const products = await stripe.products.list({
      active: true,
      expand: ["data.default_price"],
    });

    // Fetch all prices for the products
    const prices = await stripe.prices.list({
      active: true,
    });

    // Group prices by product
    const pricesByProduct = prices.data.reduce(
      (acc: Record<string, any[]>, price: any) => {
        const productId =
          typeof price.product === "string" ? price.product : price.product.id;
        if (!acc[productId]) {
          acc[productId] = [];
        }
        acc[productId].push(price);
        return acc;
      },
      {} as Record<string, any[]>
    );

    // Mark all existing products as inactive
    await db.update(stripeProducts).set({ active: false });

    await db.update(stripePrices).set({ active: false });

    // Process each Stripe product
    for (const product of products.data) {
      // Upsert the product
      const productData = {
        id: product.id,
        name: product.name,
        description: product.description || null,
        active: product.active,
        metadata: product.metadata || {},
      };

      await db.insert(stripeProducts).values(productData).onConflictDoUpdate({
        target: stripeProducts.id,
        set: productData,
      });

      // Process prices for this product
      const productPrices = pricesByProduct[product.id] || [];
      for (const price of productPrices) {
        const priceData = {
          id: price.id,
          productId: product.id,
          active: price.active,
          currency: price.currency,
          type: price.type,
          unitAmount: price.unit_amount || null,
          interval: price.recurring?.interval || null,
          intervalCount: price.recurring?.interval_count || null,
          trialPeriodDays: price.recurring?.trial_period_days || null,
          metadata: price.metadata || {},
        };

        await db.insert(stripePrices).values(priceData).onConflictDoUpdate({
          target: stripePrices.id,
          set: priceData,
        });
      }
    }

    // Update cache timestamp
    productSyncCache.lastSync = now;
    console.log('✅ Products auto-sync completed successfully!');
  } catch (error) {
    console.error('❌ Auto-sync failed:', error);
    // Don't throw error to prevent page from breaking
  }
};

export const getUserSubscription = async (userId: string, autoSync = true) => {
  if (autoSync) {
    await syncUserStripeData(userId);
  }
  
  const result = await db.query.userSubscriptions.findFirst({
    where: and(
      eq(userSubscriptions.userId, userId),
      or(
        eq(userSubscriptions.status, 'active'),
        eq(userSubscriptions.status, 'trialing')
      )
    ),
    with: {
      stripeProduct: true,
      stripePrice: true,
    },
    orderBy: desc(userSubscriptions.createdAt),
  });
  
  return result || null;
};

export const getUserActiveSubscriptions = async (userId: string) => {
  return await db.query.userSubscriptions.findMany({
    where: and(
      eq(userSubscriptions.userId, userId),
      or(
        eq(userSubscriptions.status, 'active'),
        eq(userSubscriptions.status, 'trialing')
      )
    ),
    with: {
      stripeProduct: true,
      stripePrice: true,
    },
    orderBy: desc(userSubscriptions.createdAt),
  });
};

export const hasActiveSubscription = async (
  userId: string
): Promise<boolean> => {
  const subscription = await getUserSubscription(userId);
  return !!subscription;
};

export const getSubscriptionTier = async (userId: string) => {
  const subscription = await getUserSubscription(userId);
  return subscription?.stripeProduct || null;
};

export const updateUserTokens = async (userId: string, productId: string) => {
  const product = await db.query.stripeProducts.findFirst({
    where: eq(stripeProducts.id, productId),
  });

  if (!product?.metadata) return;

  const metadata = product.metadata as any;
  const tokens = parseInt(metadata.tokens || "0");

  if (tokens > 0) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.update(users).set({
      tokens,
      tokensExpiresAt: expiresAt,
    }).where(eq(users.id, userId));
  }
};

export const getUserTokens = async (
  userId: string
): Promise<{
  tokens: number;
  expired: boolean;
  expiresAt?: Date | null;
}> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      tokens: true,
      tokensExpiresAt: true,
      stripeProductId: true,
      membershipStatus: true,
    },
  });

  if (!user) return { tokens: 0, expired: true };

  const now = new Date();
  const expired = user.tokensExpiresAt ? user.tokensExpiresAt < now : true;

  if (
    expired &&
    user.membershipStatus === MembershipStatusEnum.ACTIVE &&
    user.stripeProductId
  ) {
    await updateUserTokens(userId, user.stripeProductId);
    return getUserTokens(userId);
  }

  return {
    tokens: expired ? 0 : user.tokens,
    expired,
    expiresAt: user.tokensExpiresAt,
  };
};

export const consumeTokens = async (userId: string, amount: number = 1) => {
  const tokenInfo = await getUserTokens(userId);

  if (tokenInfo.expired || tokenInfo.tokens < amount) {
    return false;
  }

  await db.update(users).set({
    tokens: sql`${users.tokens} - ${amount}`,
  }).where(eq(users.id, userId));

  return true;
};

export const isUserAdmin = async (userId: string): Promise<boolean> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });

  return user?.role === UserRoleEnum.ADMIN;
};

export async function checkUserAccess(userId: string, autoSync = true) {
  // Auto-sync user data if enabled
  if (autoSync) {
    await syncUserStripeData(userId);
  }

  // TODO: Convert complex query with subscriptions - stubbed for now
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  // Stubbed - return basic access for testing
  const activeSubscription = null;

  if (!user) {
    return {
      hasAccess: false,
      subscription: null,
      user: null,
    };
  }

  const hasAccess = user?.role === UserRoleEnum.ADMIN || !!activeSubscription;

  return {
    hasAccess,
    subscription: activeSubscription,
    user,
  };
}

export async function updateUserMembership(
  userId: string,
  stripeProductId: string | null,
  membershipStatus: MembershipStatus = MembershipStatusEnum.ACTIVE
) {
  // Get current user to check if they're an admin
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });

  // Preserve admin role, otherwise set based on subscription
  const role = currentUser?.role === UserRoleEnum.ADMIN 
    ? UserRoleEnum.ADMIN 
    : stripeProductId ? UserRoleEnum.PREMIUM : UserRoleEnum.USER;

  await db.update(users).set({
    stripeProductId,
    membershipStatus,
    role,
  }).where(eq(users.id, userId));
}

export async function getStripeProducts(autoSync = true) {
  try {
    // Auto-sync products if enabled
    if (autoSync) {
      await syncStripeProductsAuto();
    }

    return await db.query.stripeProducts.findMany({
      where: eq(stripeProducts.active, true),
      with: {
        prices: true,
      },
    });
  } catch (error) {
    console.error("Error fetching Stripe products:", error);
    // Return empty array as fallback
    return [];
  }
}

// Helper function to check if user has access to specific content
export function hasProductAccess(
  userProductId: string | null,
  requiredProductId: string | null
): boolean {
  if (!requiredProductId) return true;
  if (!userProductId) return false;
  return userProductId === requiredProductId;
}

// Helper function to check if user has any premium access
export function hasPremiumAccess(userProductId: string | null): boolean {
  return !!userProductId;
}

// Get product features from metadata
export function getProductFeatures(product: any): string[] {
  if (!product?.metadata?.features) return [];
  try {
    return JSON.parse(product.metadata.features);
  } catch {
    return [];
  }
}

// Get product display name from metadata or use product name
export function getProductDisplayName(product: any): string {
  return product?.metadata?.displayName || product?.name || "Unknown";
}

// Legacy function for backward compatibility - maps to new system
export async function getMembershipTiers(autoSync = true) {
  try {
    const products = await getStripeProducts(autoSync);

    // Transform Stripe products to look like old membership tiers for compatibility
    return products.map((product, index) => ({
      id: product.id,
      name: product.name.toLowerCase().replace(/\s+/g, "_"),
      displayName: getProductDisplayName(product),
      description: product.description || "",
      price: product.prices[0]?.unitAmount || 0,
      currency: product.prices[0]?.currency || "usd",
      interval: product.prices[0]?.interval || null,
      features: getProductFeatures(product),
      isActive: product.active,
      sortOrder: index,
      stripeProducts: [product], // Wrap in array for compatibility
    }));
  } catch (error) {
    console.error("Error fetching membership tiers:", error);
    return [];
  }
}
