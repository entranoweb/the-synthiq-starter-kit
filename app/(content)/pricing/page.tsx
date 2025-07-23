import ManageSubscription from "@/components/pricing/manage-subscription";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  getMembershipTiers,
  getUserSubscription,
  hasActiveSubscription,
} from "@/lib/subscription";
import { Check, DollarSign, Headphones, Star, Zap } from "lucide-react";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";

export default async function PricingPage() {
  const session = await getSession({ headers: await headers() });

  // Check if user has active subscription
  const userHasActiveSubscription = session?.user?.id
    ? await hasActiveSubscription(session.user.id)
    : false;

  const activeSubscription =
    session?.user?.id && userHasActiveSubscription
      ? await getUserSubscription(session.user.id)
      : null;

  // If user has active subscription, show manage subscription section
  if (userHasActiveSubscription && activeSubscription) {
    return <ManageSubscription activeSubscription={activeSubscription} />;
  }

  // Regular pricing page for non-subscribers
  const membershipTiers = await getMembershipTiers();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 flex items-center justify-center gap-3">
            <DollarSign className="h-10 w-10 text-green-500" />
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Select the perfect plan for your needs. Upgrade or downgrade at any
            time with our flexible billing options.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto mb-16">
          {membershipTiers.map((tier: any) => (
            <div key={tier.id} className="w-full md:w-80 lg:w-72 xl:w-80">
              <PricingCard
                tier={tier}
                stripeProducts={tier.stripeProducts}
              />
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            What's Included
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="text-center">
                <Check className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <CardTitle className="text-lg">All Plans Include</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Access to free content</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Community forum access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Basic tutorials</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Email support</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="text-center">
                <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <CardTitle className="text-lg">Premium Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Advanced tutorials</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Premium templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Exclusive tools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Early access</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="text-center">
                <Headphones className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <CardTitle className="text-lg">Premium Support</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Live chat access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Video consultations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Dedicated account manager</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I change my plan later?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time.
                  Changes will be prorated and reflected in your next billing
                  cycle.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What payment methods do you accept?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We accept all major credit cards, PayPal, and other secure
                  payment methods through our payment processor Stripe.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Is there a free trial?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We offer a generous free tier with access to basic content.
                  You can upgrade to premium at any time to unlock advanced
                  features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="text-center mb-16">
          <Card className="max-w-2xl mx-auto border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Zap className="h-6 w-6 text-orange-500" />
                Need a Custom Solution?
              </CardTitle>
              <CardDescription className="text-lg">
                Perfect for teams and large organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Contact us for enterprise pricing, custom features, dedicated
                support, and solutions tailored to your organization's specific
                needs.
              </p>
              <Button size="lg" variant="outline">
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
