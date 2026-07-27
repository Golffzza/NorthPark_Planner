import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/me/route";
import { AuthenticationError } from "@/lib/auth/current-user";

const currentUserMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/current-user")>(
    "@/lib/auth/current-user",
  );

  return {
    ...actual,
    ...currentUserMock,
  };
});

describe("GET /api/v1/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current user", async () => {
    currentUserMock.getCurrentUser.mockResolvedValue({
      id: "user_1",
      displayName: "LINE Traveler",
      email: "traveler@example.com",
      role: "USER",
      lineUserId: "U123",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("user_1");
  });

  it("returns 401 when no current user can be resolved", async () => {
    currentUserMock.getCurrentUser.mockRejectedValue(new AuthenticationError("Unauthorized"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });
});
