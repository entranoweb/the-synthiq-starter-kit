import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
  appInfo: {
    name: "Synthiq Starter Kit",
    version: "0.1.0",
  },
});

export const getStripePrice = async (priceId: string) => {
  try {
    const price = await stripe.prices.retrieve(priceId);
    return price;
  } catch (error) {
    console.error("Error fetching price:", error);
    return null;
  }
};

export const getStripeProduct = async (productId: string) => {
  try {
    const product = await stripe.products.retrieve(productId);
    return product;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
};
