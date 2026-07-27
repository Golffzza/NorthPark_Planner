"use client";

import type { ReactNode } from "react";

import { createContext, useEffect, useState } from "react";

import { type LiffShellState, initializeLiff } from "@/lib/line/liff-client";

type LiffContextValue = LiffShellState;

const initialState: LiffContextValue = {
  status: "loading",
  isInLine: false,
  liffIdConfigured: Boolean(process.env.NEXT_PUBLIC_LIFF_ID?.trim()),
};

export const LiffContext = createContext<LiffContextValue | undefined>(undefined);

type LiffProviderProps = {
  children: ReactNode;
};

export function LiffProvider({ children }: LiffProviderProps) {
  const [state, setState] = useState<LiffContextValue>(initialState);

  useEffect(() => {
    let isActive = true;

    async function init() {
      const nextState = await initializeLiff();

      if (isActive) {
        setState(nextState);
      }
    }

    void init();

    return () => {
      isActive = false;
    };
  }, []);

  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>;
}
