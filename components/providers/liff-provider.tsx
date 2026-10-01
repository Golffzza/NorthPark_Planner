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
  const [state, setState] = useState<LiffContextValue>(() => {
    const hasLiffId = Boolean(process.env.NEXT_PUBLIC_LIFF_ID?.trim());
    if (!hasLiffId) {
      return {
        status: "notInLine",
        isInLine: false,
        liffIdConfigured: false,
      };
    }
    return initialState;
  });

  useEffect(() => {
    if (!state.liffIdConfigured) {
      return;
    }

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
  }, [state.liffIdConfigured]);

  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>;
}
