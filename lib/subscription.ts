import { stripe } from "./stripe";
import { db } from "./db";
import { users, userSubscriptions, stripeProducts, stripePrices } from "./db/schema";
import { userRoleEnum, membershipStatusEnum } from "./db/enums";
import { eq, and, desc } from "drizzle-orm";

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
    const customer = await prisma.stripeCustomer.findUnique({
      where: { userId },
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
    await prisma.stripeProduct.updateMany({
      data: { active: false },
    });

    await prisma.stripePrice.updateMany({
      data: { active: false },
    });

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

      await prisma.stripeProduct.upsert({
        where: { id: product.id },
        update: productData,
        create: productData,
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

        await prisma.stripePrice.upsert({
          where: { id: price.id },
          update: priceData,
          create: priceData,
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
  
  return await prisma.userSubscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
    },
    include: {
      stripeProduct: true,
      stripePrice: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getUserActiveSubscriptions = async (userId: string) => {
  return await prisma.userSubscription.findMany({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
    },
    include: {
      stripeProduct: true,
      stripePrice: true,
    },
    orderBy: {
      createdAt: "desc",
    },
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
  const product = await prisma.stripeProduct.findUnique({
    where: { id: productId },
  });

  if (!product?.metadata) return;

  const metadata = product.metadata as any;
  const tokens = parseInt(metadata.tokens || "0");

  if (tokens > 0) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.user.update({
      where: { id: userId },
      data: {
        tokens,
        tokensExpiresAt: expiresAt,
      },
    });
  }
};

export const getUserTokens = async (
  userId: string
): Promise<{
  tokens: number;
  expired: boolean;
  expiresAt?: Date | null;
}> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
    user.membershipStatus === MembershipStatus.ACTIVE &&
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

  await prisma.user.update({
    where: { id: userId },
    data: {
      tokens: {
        decrement: amount,
      },
    },
  });

  return true;
};

export const isUserAdmin = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === UserRole.ADMIN;
};

export async function checkUserAccess(userId: string, autoSync = true) {
  // Auto-sync user data if enabled
  if (autoSync) {
    await syncUserStripeData(userId);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: {
          status: { in: ["active", "trialing"] },
        },
        include: {
          stripeProduct: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!user) {
    return {
      hasAccess: false,
      subscription: null,
      user: null,
    };
  }

  const activeSubscription = user.subscriptions[0] || null;
  const hasAccess = user.role === UserRole.ADMIN || !!activeSubscription;

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
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // Preserve admin role, otherwise set based on subscription
  const role = currentUser?.role === UserRole.ADMIN 
    ? UserRole.ADMIN 
    : stripeProductId ? UserRole.PREMIUM : UserRole.USER;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeProductId,
      membershipStatus,
      role,
    },
  });
}

export async function getStripeProducts(autoSync = true) {
  try {
    // Auto-sync products if enabled
    if (autoSync) {
      await syncStripeProductsAuto();
    }

    return await prisma.stripeProduct.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        prices: {
          where: { active: true },
          orderBy: { unitAmount: "asc" },
        },
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
