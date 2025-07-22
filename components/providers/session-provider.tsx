"use client";

import { ReactNode } from "react";

interface SessionProviderProps {
  children: ReactNode;
  session?: any; // BetterAuth session type
}

// Temporary stub - BetterAuth handles sessions differently
export function SessionProvider({ children }: SessionProviderProps) {
  return <>{children}</>;
}
