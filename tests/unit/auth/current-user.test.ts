import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError, getCurrentUser } from "@/lib/auth/current-user";
import { issueUserSession } from "@/lib/auth/session-service";

const cookiesMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  userSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

const mockAuthModule = vi.hoisted(() => ({
  getMockCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/auth/mock-current-user", () => mockAuthModule);

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "test-session-secret";
    process.env.SESSION_COOKIE_NAME = "northpark_session";
    process.env.USE_MOCK_AUTH = "false";

    prismaMock.userSession.create.mockResolvedValue({
      id: "session_1",
      userId: "user_1",
      tokenHash: "hashed",
    });
  });

  it("reads the current user from an issued session cookie", async () => {
    const token = await issueUserSession("user_1");

    prismaMock.userSession.findUnique.mockResolvedValue({
      id: "session_1",
      userId: "user_1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      revokedAt: null,
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      lineUserId: "U123",
      displayName: "LINE Traveler",
      email: "traveler@example.com",
      role: "USER",
    });
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
    });

    const user = await getCurrentUser();

    expect(user.id).toBe("user_1");
    expect(prismaMock.userSession.findUnique).toHaveBeenCalled();
  });

  it("rejects when no valid session exists and mock auth is disabled", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    await expect(getCurrentUser()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("falls back to the mock user only when USE_MOCK_AUTH=true", async () => {
    process.env.USE_MOCK_AUTH = "true";
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
    mockAuthModule.getMockCurrentUser.mockResolvedValue({
      id: "demo_user",
      displayName: "Demo User",
      email: "demo.user@northpark.local",
      role: "USER",
    });

    const user = await getCurrentUser();

    expect(mockAuthModule.getMockCurrentUser).toHaveBeenCalled();
    expect(user.id).toBe("demo_user");
  });
});
