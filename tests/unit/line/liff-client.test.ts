import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeLiff, type LiffClientLike } from "@/lib/line/liff-client";

function createLiffMock(isInClient: boolean): LiffClientLike {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    isInClient: vi.fn().mockReturnValue(isInClient),
  };
}

describe("initializeLiff", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_LIFF_ID;
    vi.restoreAllMocks();
  });

  it("returns an error state when NEXT_PUBLIC_LIFF_ID is missing", async () => {
    delete process.env.NEXT_PUBLIC_LIFF_ID;

    const state = await initializeLiff();

    expect(state).toEqual({
      status: "error",
      isInLine: false,
      liffIdConfigured: false,
      message: "LIFF is not configured for this environment.",
    });
  });

  it("returns a ready state when LIFF initializes inside the LINE client", async () => {
    process.env.NEXT_PUBLIC_LIFF_ID = "test-liff-id";

    const liffMock = createLiffMock(true);

    const state = await initializeLiff(async () => liffMock);

    expect(liffMock.init).toHaveBeenCalledWith({ liffId: "test-liff-id" });
    expect(state).toEqual({
      status: "ready",
      isInLine: true,
      liffIdConfigured: true,
    });
  });

  it("returns a notInLine state when LIFF initializes in a regular browser", async () => {
    process.env.NEXT_PUBLIC_LIFF_ID = "test-liff-id";

    const liffMock = createLiffMock(false);

    const state = await initializeLiff(async () => liffMock);

    expect(state).toEqual({
      status: "notInLine",
      isInLine: false,
      liffIdConfigured: true,
      message: "Open in LINE to use the Mini App shell. The web app still works here.",
    });
  });

  it("returns an error state when the SDK init throws", async () => {
    process.env.NEXT_PUBLIC_LIFF_ID = "test-liff-id";

    const liffMock: LiffClientLike = {
      init: vi.fn().mockRejectedValue(new Error("LIFF init failed")),
      isInClient: vi.fn(),
    };

    const state = await initializeLiff(async () => liffMock);

    expect(state).toEqual({
      status: "error",
      isInLine: false,
      liffIdConfigured: true,
      message: "LIFF init failed",
    });
  });
});
