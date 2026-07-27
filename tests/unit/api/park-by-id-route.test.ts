import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/parks/[id]/route";
import { NotFoundError } from "@/lib/services/park-service";

const parkServiceMock = vi.hoisted(() => ({
  getParkDetail: vi.fn(),
}));

vi.mock("@/lib/services/park-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/park-service")>(
    "@/lib/services/park-service",
  );

  return {
    ...actual,
    ...parkServiceMock,
  };
});

describe("/api/v1/parks/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns park detail by id or slug", async () => {
    parkServiceMock.getParkDetail.mockResolvedValue({
      id: "park_1",
      slug: "doi-inthanon",
      attractions: [{ id: "attr_1" }],
      warnings: [{ id: "warn_1" }],
    });

    const response = await GET(new Request("http://localhost/api/v1/parks/doi-inthanon"), {
      params: Promise.resolve({ id: "doi-inthanon" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(parkServiceMock.getParkDetail).toHaveBeenCalledWith("doi-inthanon");
    expect(body.data.slug).toBe("doi-inthanon");
  });

  it("returns 404 when park is not found", async () => {
    parkServiceMock.getParkDetail.mockRejectedValue(new NotFoundError("Park not found"));

    const response = await GET(new Request("http://localhost/api/v1/parks/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
  });
});
