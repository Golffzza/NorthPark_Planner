import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError } from "@/lib/auth/current-user";
import { OriginGeocodingError } from "@/lib/services/origin-geocoding-service";
import { GET } from "@/app/api/v1/origins/search/route";

const mocks = vi.hoisted(() => ({ user: vi.fn(), search: vi.fn() }));
vi.mock("@/lib/auth/current-user", async () => ({
  ...await vi.importActual<typeof import("@/lib/auth/current-user")>("@/lib/auth/current-user"),
  getCurrentUser: mocks.user,
}));
vi.mock("@/lib/services/origin-geocoding-service", async () => ({
  ...await vi.importActual<typeof import("@/lib/services/origin-geocoding-service")>("@/lib/services/origin-geocoding-service"),
  searchOriginPlaces: mocks.search,
}));

describe("protected origin search route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "user-1" }); });

  it("rejects unauthenticated searches before contacting the provider", async () => {
    mocks.user.mockRejectedValue(new AuthenticationError("Unauthorized"));
    const response = await GET(new Request("http://localhost/api/v1/origins/search?q=เชียงใหม่"));
    expect(response.status).toBe(401);
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("returns only real adapter results and a private response", async () => {
    mocks.search.mockResolvedValue([{ id: "1", name: "เชียงใหม่", lat: 18.78, lng: 98.98 }]);
    const response = await GET(new Request("http://localhost/api/v1/origins/search?q=เชียงใหม่"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect((await response.json()).data[0]).toMatchObject({ lat: 18.78, lng: 98.98 });
  });

  it("distinguishes a busy provider from a bad query", async () => {
    mocks.search.mockRejectedValueOnce(new OriginGeocodingError("busy"));
    expect((await GET(new Request("http://localhost/api/v1/origins/search?q=เชียงใหม่"))).status).toBe(429);
    mocks.search.mockRejectedValueOnce(new OriginGeocodingError("invalid_query"));
    expect((await GET(new Request("http://localhost/api/v1/origins/search?q=ก"))).status).toBe(422);
  });
});
