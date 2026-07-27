import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError, getParkDetail, listParks } from "@/lib/services/park-service";

const prismaMock = vi.hoisted(() => ({
  park: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("park service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only active parks with search, province filter, and pagination meta", async () => {
    prismaMock.park.count.mockResolvedValue(2);
    prismaMock.park.findMany.mockResolvedValue([
      {
        id: "park_1",
        slug: "doi-inthanon",
        nameTh: "อุทยานแห่งชาติดอยอินทนนท์",
        nameEn: "Doi Inthanon National Park",
        province: "Chiang Mai",
        region: "NORTH",
        latitude: 18.5883,
        longitude: 98.4867,
        openTime: "05:00",
        closeTime: "18:00",
        description: "Description",
        coverImageUrl: "/images/parks/doi-inthanon.jpg",
      },
    ]);

    const result = await listParks({
      q: "doi",
      province: "Chiang Mai",
      page: 2,
      perPage: 1,
    });

    expect(prismaMock.park.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          province: "Chiang Mai",
          OR: expect.any(Array),
        }),
      }),
    );
    expect(prismaMock.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        take: 1,
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 2,
      perPage: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it("gets park detail by slug with attractions and active warnings", async () => {
    prismaMock.park.findFirst.mockResolvedValue({
      id: "park_1",
      slug: "doi-inthanon",
      nameTh: "อุทยานแห่งชาติดอยอินทนนท์",
      nameEn: "Doi Inthanon National Park",
      province: "Chiang Mai",
      region: "NORTH",
      latitude: 18.5883,
      longitude: 98.4867,
      openTime: "05:00",
      closeTime: "18:00",
      description: "Description",
      coverImageUrl: "/images/parks/doi-inthanon.jpg",
      attractions: [
        {
          id: "attr_1",
          name: "Kew Mae Pan",
          description: "Trail",
          type: "TRAIL",
          imageUrl: "/images/a.jpg",
        },
      ],
      warnings: [
        {
          id: "warn_1",
          title: "Slippery",
          description: "Careful after rain",
          severity: "MEDIUM",
          isActive: true,
        },
      ],
    });

    const result = await getParkDetail("doi-inthanon");

    expect(prismaMock.park.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          OR: [{ id: "doi-inthanon" }, { slug: "doi-inthanon" }],
        },
      }),
    );
    expect(result.slug).toBe("doi-inthanon");
    expect(result.attractions).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });

  it("throws not found when park is missing or inactive", async () => {
    prismaMock.park.findFirst.mockResolvedValue(null);

    await expect(getParkDetail("missing")).rejects.toThrow(NotFoundError);
  });
});
