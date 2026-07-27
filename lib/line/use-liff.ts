"use client";

import { useContext } from "react";

import { LiffContext } from "@/components/providers/liff-provider";

export function useLiff() {
  const context = useContext(LiffContext);

  if (!context) {
    throw new Error("useLiff must be used within a LiffProvider");
  }

  return context;
}

