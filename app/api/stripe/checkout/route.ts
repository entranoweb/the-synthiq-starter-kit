import { getSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { stripeCustomers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession({ headers: req.headers });

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { priceId } = await req.json();

    if (!priceId) {
      return new NextResponse("Price ID is required", { status: 400 });
    }

    // Get or create Stripe customer using BetterAuth integration
    let stripeCustomer = await db.query.stripeCustomers.findFirst({
      where: eq(stripeCustomers.userId, session.user.id),
    });

    let customerId: string;
    if (stripeCustomer) {
      customerId = stripeCustomer.stripeCustomerId;
    } else {
      // Create new Stripe customer - BetterAuth Stripe plugin should handle this
      // but we'll create manually for compatibility
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;
      
      // Store in database
      await db.insert(stripeCustomers).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        stripeCustomerId: customer.id,
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
