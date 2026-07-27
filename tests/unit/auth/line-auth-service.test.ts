import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidLineTokenError, syncLineProfile } from "@/lib/auth/line-auth-service";

const txMock = vi.hoisted(() => ({
  lineAccount: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("syncLineProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LINE_CHANNEL_ID = "1234567890";
    process.env.USE_MOCK_AUTH = "false";

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => unknown) => {
      return callback(txMock);
    });
  });

  it("creates and links a user from a verified LINE ID token", async () => {
    txMock.lineAccount.findUnique.mockResolvedValue(null);
    txMock.user.findFirst.mockResolvedValue(null);
    txMock.user.create.mockResolvedValue({
      id: "user_1",
      lineUserId: "U123",
      displayName: "LINE Traveler",
      email: "traveler@example.com",
      role: "USER",
    });
    txMock.lineAccount.create.mockResolvedValue({
      id: "line_1",
      userId: "user_1",
      lineUserId: "U123",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            sub: "U123",
            name: "LINE Traveler",
            picture: "https://example.com/avatar.jpg",
            email: "traveler@example.com",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const user = await syncLineProfile({
      idToken: "line-id-token",
    });

    expect(fetch).toHaveBeenCalled();
    expect(txMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lineUserId: "U123",
          displayName: "LINE Traveler",
          email: "traveler@example.com",
        }),
      }),
    );
    expect(txMock.lineAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
          lineUserId: "U123",
        }),
      }),
    );
    expect(user.id).toBe("user_1");
  });

  it("returns the existing linked user for the same LINE account", async () => {
    txMock.lineAccount.findUnique.mockResolvedValue({
      id: "line_1",
      userId: "user_1",
      lineUserId: "U123",
      user: {
        id: "user_1",
        lineUserId: "U123",
        displayName: "Existing User",
        email: "existing@example.com",
        role: "USER",
      },
    });
    txMock.lineAccount.update.mockResolvedValue({
      id: "line_1",
      userId: "user_1",
      lineUserId: "U123",
    });
    txMock.user.update.mockResolvedValue({
      id: "user_1",
      lineUserId: "U123",
      displayName: "Existing User",
      email: "existing@example.com",
      role: "USER",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            sub: "U123",
            name: "Existing User",
            picture: "https://example.com/avatar.jpg",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const user = await syncLineProfile({
      idToken: "line-id-token",
    });

    expect(txMock.user.create).not.toHaveBeenCalled();
    expect(txMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
      }),
    );
    expect(user.id).toBe("user_1");
  });

  it("rejects an invalid token when mock auth is disabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid token" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      syncLineProfile({
        idToken: "bad-token",
      }),
    ).rejects.toBeInstanceOf(InvalidLineTokenError);
  });
});
