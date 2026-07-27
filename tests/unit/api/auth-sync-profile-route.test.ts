import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/auth/line/sync-profile/route";
import { InvalidLineTokenError } from "@/lib/auth/line-auth-service";

const lineAuthServiceMock = vi.hoisted(() => ({
  syncLineProfile: vi.fn(),
}));

const sessionServiceMock = vi.hoisted(() => ({
  issueUserSession: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock("@/lib/auth/line-auth-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/line-auth-service")>(
    "@/lib/auth/line-auth-service",
  );

  return {
    ...actual,
    ...lineAuthServiceMock,
  };
});

vi.mock("@/lib/auth/session-service", () => sessionServiceMock);

describe("POST /api/v1/auth/line/sync-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionServiceMock.issueUserSession.mockResolvedValue("session-token");
    sessionServiceMock.setSessionCookie.mockImplementation((response: Response) => response);
  });

  it("syncs a LINE profile, issues a session, and returns the current user", async () => {
    lineAuthServiceMock.syncLineProfile.mockResolvedValue({
      id: "user_1",
      displayName: "LINE Traveler",
      email: "traveler@example.com",
      role: "USER",
      lineUserId: "U123",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/auth/line/sync-profile", {
        method: "POST",
        body: JSON.stringify({
          idToken: "line-id-token",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(lineAuthServiceMock.syncLineProfile).toHaveBeenCalled();
    expect(sessionServiceMock.issueUserSession).toHaveBeenCalledWith("user_1");
    expect(sessionServiceMock.setSessionCookie).toHaveBeenCalled();
    expect(body.data.user.id).toBe("user_1");
  });

  it("returns 401 when the token is invalid and mock auth is disabled", async () => {
    lineAuthServiceMock.syncLineProfile.mockRejectedValue(new InvalidLineTokenError("Invalid LINE ID token"));

    const response = await POST(
      new Request("http://localhost/api/v1/auth/line/sync-profile", {
        method: "POST",
        body: JSON.stringify({
          idToken: "bad-token",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("invalid_token");
  });
});
