import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Kanit, Noto_Sans_Thai } from "next/font/google";

import { LiffProvider } from "@/components/providers/liff-provider";

import "./globals.css";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NorthPark Planner",
  description: "Explore northern Thailand national parks, plan trips, and review suitability with a simple Phase 1 MVP.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="th" className={`dark ${kanit.variable} ${notoSansThai.variable}`}>
      <body suppressHydrationWarning className={`${kanit.className} font-sans`}>
        <LiffProvider>{children}</LiffProvider>
      </body>
    </html>
  );
}

