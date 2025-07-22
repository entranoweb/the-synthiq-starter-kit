"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, Crown, LogOut, Menu, Shield, User, X } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

interface NavbarProps {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isAdmin?: boolean;
  hasAccess?: boolean;
  hasSubscription?: boolean;
  tokenInfo?: {
    tokens: number;
    expired: boolean;
    expiresAt?: Date;
  };
}

export function Navbar({
  user,
  isAdmin,
  hasAccess,
  hasSubscription,
  tokenInfo,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      toast.error("Failed to open billing portal");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const getUserInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href={"/"} className="text-xl font-bold text-gray-900">
                Forger Starter Kit
              </Link>
            </div>

            {/* Desktop Navigation */}
            {user && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1"
                >
                  Dashboard
                </Link>
                <Link
                  href="/free-content"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1"
                >
                  Free Content
                </Link>
                {hasAccess ? (
                  <Link
                    href="/premium-content"
                    className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1"
                  >
                    <Crown className="h-4 w-4 text-yellow-500" />
                    Premium
                  </Link>
                ) : (
                  <Link
                    href="/pricing"
                    className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1"
                  >
                    Pricing
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1"
                  >
                    <Shield className="h-4 w-4 text-blue-500" />
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center">
            {user ? (
              <>
                {/* Token display */}
                {tokenInfo && (
                  <div className="hidden sm:block mr-2">
                    <Badge
                      variant={tokenInfo.expired ? "destructive" : "default"}
                      className="mr-2"
                    >
                      {tokenInfo.tokens} tokens
                    </Badge>
                  </div>
                )}

                {/* Desktop User Menu */}
                <div className="hidden sm:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full"
                      >
                        <Avatar className="h-8 w-8 cursor-pointer hover:scale-105 transition-all duration-300">
                          <AvatarImage
                            src={user.image || ""}
                            alt={user.name || ""}
                          />
                          <AvatarFallback>
                            {getUserInitials(user.name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.name || "User"}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>

                      {hasSubscription && (
                        <DropdownMenuItem
                          onClick={handleManageSubscription}
                          className="cursor-pointer"
                          disabled={isPortalLoading}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          <span>
                            {isPortalLoading
                              ? "Loading..."
                              : "Manage Subscription"}
                          </span>
                        </DropdownMenuItem>
                      )}

                      {!hasAccess && (
                        <DropdownMenuItem asChild>
                          <Link href="/pricing" className="cursor-pointer">
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Upgrade to Premium</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer">
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Admin Panel</span>
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile menu button */}
                <div className="sm:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Button asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {user && mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {/* User info */}
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image || ""} alt={user.name || ""} />
                  <AvatarFallback>
                    {getUserInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              {tokenInfo && (
                <div className="mt-2">
                  <Badge
                    variant={tokenInfo.expired ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {tokenInfo.tokens} tokens
                  </Badge>
                </div>
              )}
            </div>

            {/* Navigation links */}
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/free-content"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Free Content
            </Link>
            {hasAccess ? (
              <Link
                href="/premium-content"
                className="flex items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                Premium Content
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="mr-2 h-4 w-4 text-blue-500" />
                Admin Panel
              </Link>
            )}

            {/* Manage Subscription for mobile */}
            {hasSubscription ? (
              <button
                onClick={() => {
                  handleManageSubscription();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center w-full px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                disabled={isPortalLoading}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isPortalLoading ? "Loading..." : "Manage Subscription"}
              </button>
            ) : null}

            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center w-full px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
