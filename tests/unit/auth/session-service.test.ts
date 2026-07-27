import { beforeEach, describe, expect, it, vi } from "vitest";

import { issueUserSession, revokeSessionToken } from "@/lib/auth/session-service";

const prismaMock = vi.hoisted(() => ({
  userSession: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("session-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "test-session-secret";
    process.env.SESSION_COOKIE_NAME = "northpark_session";
    prismaMock.userSession.create.mockResolvedValue({
      id: "session_1",
      userId: "user_1",
      tokenHash: "hashed",
    });
    prismaMock.userSession.updateMany.mockResolvedValue({ count: 1 });
  });

  it("creates a persisted session token for a user", async () => {
    const token = await issueUserSession("user_1");

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
    expect(prismaMock.userSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it("revokes an existing session token", async () => {
    await revokeSessionToken("raw-session-token");

    expect(prismaMock.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
        }),
      }),
    );
  });
});
