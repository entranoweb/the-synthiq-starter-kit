"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface MembershipTier {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: StripePrice[];
}

interface StripePrice {
  id: string;
  unitAmount: number | null;
  currency: string;
  type: string;
  interval: string | null;
  intervalCount: number | null;
  active: boolean;
}

interface PricingCardProps {
  tier: MembershipTier;
  stripeProducts: StripeProduct[];
}

export function PricingCard({ tier, stripeProducts }: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  // Get the first active Stripe product and price for this tier
  const stripeProduct = stripeProducts[0];
  const stripePrice = stripeProduct?.prices[0];

  const formatPrice = (amount: number, currency: string) => {
    if (amount === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const handleSubscribe = async () => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    // Free tier doesn't need subscription
    if (tier.name === "free") {
      toast.success("You already have access to the free tier!");
      return;
    }

    if (!stripePrice) {
      toast.error("No pricing available for this plan");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: stripePrice.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { sessionId } = await response.json();

      if (typeof window !== "undefined" && window.Stripe) {
        const stripe = window.Stripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        );
        const { error } = await stripe.redirectToCheckout({ sessionId });

        if (error) {
          throw new Error(error.message);
        }
      } else {
        window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout process");
    } finally {
      setIsLoading(false);
    }
  };

  const isPopular = tier.name === "premium";
  const isFree = tier.name === "free";

  return (
    <Card
      className={`relative ${isPopular ? "border-blue-500 shadow-lg scale-105" : "border-gray-200"
        }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{tier.displayName}</CardTitle>
        <CardDescription className="min-h-[3rem] flex items-center justify-center">
          {tier.description}
        </CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">
            {formatPrice(tier.price, tier.currency)}
          </span>
          {tier.interval && (
            <span className="text-gray-600">/{tier.interval}</span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ul className="space-y-3 mb-6 min-h-[4rem]">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <span className="text-green-500 mr-2 mt-0.5 flex-shrink-0">
                ✓
              </span>
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={`w-full ${isPopular ? "bg-blue-500 hover:bg-blue-600" : ""
            }`}
          variant={isFree ? "outline" : "default"}
          onClick={handleSubscribe}
          disabled={isLoading}
        >
          {isLoading
            ? "Processing..."
            : isFree
              ? "Get Started"
              : `Subscribe to ${tier.displayName}`}
        </Button>

        {!isFree && !stripePrice && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Configure in Stripe to enable
          </p>
        )}
      </CardContent>
    </Card>
  );
}
