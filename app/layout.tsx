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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Noto+Sans+Thai:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <LiffProvider>{children}</LiffProvider>
      </body>
    </html>
  );
}
