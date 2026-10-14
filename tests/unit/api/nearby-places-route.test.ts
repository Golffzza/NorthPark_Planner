import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/parks/[id]/nearby/route";
import { AuthenticationError } from "@/lib/auth/current-user";

const auth = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/current-user", async () => ({
  ...(await vi.importActual<typeof import("@/lib/auth/current-user")>("@/lib/auth/current-user")),
  getCurrentUser: auth,
}));
vi.mock("@/lib/services/nearby-places-service", async () => ({
  ...(await vi.importActual<typeof import("@/lib/services/nearby-places-service")>("@/lib/services/nearby-places-service")),
  searchNearbyPlacesForPark: search,
}));

const context = { params: Promise.resolve({ id: "lan-sang" }) };
function request(query = "") {
  return new Request(`http://localhost/api/v1/parks/lan-sang/nearby${query}`);
}

describe("GET /api/v1/parks/[id]/nearby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ id: "user-1" });
    search.mockResolvedValue({ status: "EMPTY", places: [], park: { slug: "lan-sang" } });
  });

  it("requires authentication", async () => {
    auth.mockRejectedValue(new AuthenticationError("Unauthorized"));
    const response = await GET(request(), context);
    expect(response.status).toBe(401);
    expect(search).not.toHaveBeenCalled();
  });

  it("passes validated options and returns empty results as success", async () => {
    const input = request("?categories=food,service&radiusMeters=1500&limit=4");
    const response = await GET(input, context);
    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe("EMPTY");
    expect(search).toHaveBeenCalledWith("lan-sang", { categories: ["food", "service"], radiusMeters: 1500, limit: 4 }, {}, input.signal);
  });

  it("returns optional road routing fields without changing the Nearby envelope", async () => {
    search.mockResolvedValue({
      status: "OK", park: { id: "park-1", slug: "lan-sang" },
      places: [{ id: "osm:node:1", straightLineDistanceMeters: 273,
        roadDistanceMeters: 510, estimatedDrivingMinutes: 2, routeStatus: "OK" }],
    });
    const response = await GET(request("?categories=food"), context);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      status: "OK", park: { slug: "lan-sang" }, places: [{
        id: "osm:node:1", straightLineDistanceMeters: 273,
        roadDistanceMeters: 510, estimatedDrivingMinutes: 2, routeStatus: "OK",
      }],
    });
  });

  it.each(["?radiusMeters=50000", "?categories=unknown", "?limit=0", "?lat=1"])("rejects invalid query %s", async (query) => {
    const response = await GET(request(query), context);
    expect(response.status).toBe(422);
    expect(search).not.toHaveBeenCalled();
  });

  it.each([
    ["PARK_NOT_FOUND", 404], ["COORDINATE_REVIEW_REQUIRED", 409],
    ["INVALID_COORDINATES", 422], ["UPSTREAM_RATE_LIMITED", 503],
    ["UPSTREAM_TIMEOUT", 503], ["UPSTREAM_UNAVAILABLE", 503],
  ] as const)("maps %s to HTTP %i", async (status, expected) => {
    search.mockResolvedValue({ status, places: [] });
    const response = await GET(request(), context);
    expect(response.status).toBe(expected);
    expect((await response.json()).data.status).toBe(status);
  });
});
