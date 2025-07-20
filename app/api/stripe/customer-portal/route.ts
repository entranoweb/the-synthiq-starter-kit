import { PrismaClient } from "@/lib/db/_legacy-prisma-stubs"; // TEMP: redirected from broken "@/app/generated/prisma"
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to access the customer portal." },
        { status: 401 }
      );
    }

    // Get the customer's Stripe customer ID
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: {
        userId: session.user.id,
      },
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
