import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/parks/route";
import { BadRequestError } from "@/lib/validations/park-query";

const parkServiceMock = vi.hoisted(() => ({
  listParks: vi.fn(),
}));

vi.mock("@/lib/services/park-service", () => parkServiceMock);

describe("/api/v1/parks route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active parks with meta", async () => {
    parkServiceMock.listParks.mockResolvedValue({
      data: [
        {
          id: "park_1",
          slug: "doi-inthanon",
        },
      ],
      meta: {
        page: 1,
        perPage: 10,
        total: 1,
        totalPages: 1,
      },
    });

    const response = await GET(
      new Request("http://localhost/api/v1/parks?q=doi&province=Chiang%20Mai&page=1&perPage=10"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(parkServiceMock.listParks).toHaveBeenCalledWith({
      q: "doi",
      province: "Chiang Mai",
      page: 1,
      perPage: 10,
    });
    expect(body.meta.total).toBe(1);
  });

  it("returns 400 when query is invalid", async () => {
    parkServiceMock.listParks.mockRejectedValue(new BadRequestError("Invalid query parameters"));

    const response = await GET(new Request("http://localhost/api/v1/parks?page=0"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
  });
});
