import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/auth/logout/route";

const sessionServiceMock = vi.hoisted(() => ({
  clearSessionCookie: vi.fn(),
  revokeCurrentSession: vi.fn(),
}));

vi.mock("@/lib/auth/session-service", () => sessionServiceMock);

describe("POST /api/v1/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionServiceMock.clearSessionCookie.mockImplementation((response: Response) => response);
    sessionServiceMock.revokeCurrentSession.mockResolvedValue(undefined);
  });

  it("revokes the current session and clears the session cookie", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(sessionServiceMock.revokeCurrentSession).toHaveBeenCalled();
    expect(sessionServiceMock.clearSessionCookie).toHaveBeenCalled();
    expect(body.data.loggedOut).toBe(true);
  });
});
