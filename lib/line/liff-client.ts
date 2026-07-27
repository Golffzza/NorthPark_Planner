"use client";

export type LiffShellStatus = "loading" | "ready" | "notInLine" | "error";

export type LiffClientLike = {
  init: (config: { liffId: string }) => Promise<void>;
  isInClient: () => boolean;
};

export type LiffShellState = {
  status: LiffShellStatus;
  isInLine: boolean;
  liffIdConfigured: boolean;
  message?: string;
};

export type LiffLoader = () => Promise<LiffClientLike>;

function getConfiguredLiffId() {
  return process.env.NEXT_PUBLIC_LIFF_ID?.trim() ?? "";
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to initialize the LINE Mini App shell.";
}

export async function loadLiffSdk() {
  const liffModule = await import("@line/liff");

  return liffModule.default as LiffClientLike;
}

export async function initializeLiff(loadLiff: LiffLoader = loadLiffSdk): Promise<LiffShellState> {
  const liffId = getConfiguredLiffId();

  if (!liffId) {
    return {
      status: "error",
      isInLine: false,
      liffIdConfigured: false,
      message: "LIFF is not configured for this environment.",
    };
  }

  try {
    const liff = await loadLiff();

    await liff.init({ liffId });

    const isInLine = liff.isInClient();

    if (!isInLine) {
      return {
        status: "notInLine",
        isInLine: false,
        liffIdConfigured: true,
        message: "Open in LINE to use the Mini App shell. The web app still works here.",
      };
    }

    return {
      status: "ready",
      isInLine: true,
      liffIdConfigured: true,
    };
  } catch (error) {
    return {
      status: "error",
      isInLine: false,
      liffIdConfigured: true,
      message: normalizeErrorMessage(error),
    };
  }
}
