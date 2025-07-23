import { getSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { stripeCustomers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to access the customer portal." },
        { status: 401 }
      );
    }

    // Get the customer's Stripe customer ID
    const stripeCustomer = await db.query.stripeCustomers.findFirst({
      where: eq(stripeCustomers.userId, session.user.id),
    });

    if (!stripeCustomer?.stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "No billing information found. Please subscribe to a plan first.",
        },
        { status: 404 }
      );
    }

    // Parse the return URL from the request
    const { searchParams } = new URL(request.url);
    const origin = request.headers.get("origin");
    const returnUrl = searchParams.get("return_url") || `${origin}/dashboard`;

    // Create the customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    return NextResponse.json(
      { error: "Failed to create customer portal session." },
      { status: 500 }
    );
  }
}
