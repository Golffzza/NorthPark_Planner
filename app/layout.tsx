import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LiffProvider } from "@/components/providers/liff-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "NorthPark Planner",
  description: "Explore northern Thailand national parks, plan trips, and review suitability with a simple Phase 1 MVP.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="th" className="dark">
      <body suppressHydrationWarning>
        <LiffProvider>{children}</LiffProvider>
      </body>
    </html>
  );
}
