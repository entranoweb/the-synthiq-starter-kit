import { Navbar } from "@/components/navbar";

import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";
import {
  checkUserAccess,
  getUserTokens,
  isUserAdmin,
} from "@/lib/subscription";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synthiq Starter Kit",
  description: "Next.js starter with NextAuth and Stripe",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession({
    headers: await headers()
  });

  // Get user data for navbar if authenticated
  let navbarData = {};
  if (session?.user) {
    const [{ hasAccess, subscription }, tokenInfo, adminStatus] =
      await Promise.all([
        checkUserAccess(session.user.id),
        getUserTokens(session.user.id),
        isUserAdmin(session.user.id),
      ]);

    navbarData = {
      user: session.user,
      hasAccess,
      tokenInfo,
      isAdmin: adminStatus,
      hasSubscription: !!subscription,
    };
  }

  return (
    <html lang="en">
      <head>
        <script src="https://js.stripe.com/v3/" async></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader showSpinner={false} color="#5c7aff" />
        <Navbar {...navbarData} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
