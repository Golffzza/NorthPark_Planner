import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { mapParkToDetailDto, mapParkToListDto, type ParkDetailDto, type ParkListItemDto } from "@/lib/mappers/park-dto";
import type { ParkListQuery } from "@/lib/validations/park-query";
import { parks as seedParks } from "@/prisma/seed-data/parks";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export type ParkListResult = {
  data: ParkListItemDto[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type ParkOption = {
  id: string;
  slug: string;
  nameTh: string;
  nameEn?: string | null;
  province: string;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
};

const fallbackParks = seedParks.map((p) => ({
  id: `park-${p.slug}`,
  slug: p.slug,
  nameTh: p.nameTh,
  nameEn: p.nameEn,
  province: p.province,
  region: p.region,
  latitude: p.latitude,
  longitude: p.longitude,
  openTime: p.openTime,
  closeTime: p.closeTime,
  description: p.description,
  coverImageUrl: p.coverImageUrl,
  isActive: p.isActive,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  attractions: p.attractions.map((att, aIdx) => ({
    id: `attraction-${p.slug}-${aIdx + 1}`,
    parkId: `park-${p.slug}`,
    name: att.name,
    description: att.description,
    type: att.type,
    imageUrl: att.imageUrl ?? null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
  warnings: p.warnings.map((w, wIdx) => ({
    id: `warning-${p.slug}-${wIdx + 1}`,
    parkId: `park-${p.slug}`,
    title: w.title,
    description: w.description,
    severity: w.severity,
    isActive: w.isActive,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
}));

export async function listParkProvinces(): Promise<string[]> {
  if (typeof prisma?.park?.findMany === "function") {
    try {
      const parks = await prisma.park.findMany({
        where: {
          isActive: true,
        },
        select: {
          province: true,
        },
        distinct: ["province"],
        orderBy: {
          province: "asc",
        },
      });

      if (parks.length > 0) {
        return parks.map((park) => park.province);
      }
    } catch (error) {
      console.warn("[park-service] Database query failed, using in-memory seed fallback for provinces:", error);
    }
  }

  const set = new Set(fallbackParks.filter((p) => p.isActive).map((p) => p.province));
  return Array.from(set).sort();
}

export async function listParkOptions(): Promise<ParkOption[]> {
  if (typeof prisma?.park?.findMany === "function") {
    try {
      const parks = await prisma.park.findMany({
        where: {
          isActive: true,
        },
        orderBy: [{ province: "asc" }, { nameTh: "asc" }],
        select: {
          id: true,
          slug: true,
          nameTh: true,
          nameEn: true,
          province: true,
          latitude: true,
          longitude: true,
          coverImageUrl: true,
          openTime: true,
          closeTime: true,
        },
      });

      if (parks.length > 0) {
        return parks.map((park) => ({
          id: park.id,
          slug: park.slug,
          nameTh: park.nameTh,
          nameEn: park.nameEn,
          province: park.province,
          latitude: park.latitude === null ? null : Number(park.latitude),
          longitude: park.longitude === null ? null : Number(park.longitude),
          coverImageUrl: park.coverImageUrl,
          openTime: park.openTime,
          closeTime: park.closeTime,
        }));
      }
    } catch (error) {
      console.warn("[park-service] Database query failed, using in-memory seed fallback for park options:", error);
    }
  }

  return fallbackParks
    .filter((p) => p.isActive)
    .sort((a, b) => a.province.localeCompare(b.province) || a.nameTh.localeCompare(b.nameTh))
    .map((park) => ({
      id: park.id,
      slug: park.slug,
      nameTh: park.nameTh,
      nameEn: park.nameEn,
      province: park.province,
      latitude: park.latitude,
      longitude: park.longitude,
      coverImageUrl: park.coverImageUrl,
      openTime: park.openTime,
      closeTime: park.closeTime,
    }));
}

function buildParkWhere(query: ParkListQuery): Prisma.ParkWhereInput {
  const search = query.q?.trim();

  return {
    isActive: true,
    ...(query.province ? { province: query.province } : {}),
    ...(search
      ? {
          OR: [
            { nameTh: { contains: search, mode: "insensitive" } },
            { nameEn: { contains: search, mode: "insensitive" } },
            { province: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            {
              attractions: {
                some: {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function listParks(query: ParkListQuery): Promise<ParkListResult> {
  if (typeof prisma?.park?.findMany === "function" && typeof prisma?.park?.count === "function") {
    try {
      const where = buildParkWhere(query);
      const skip = (query.page - 1) * query.perPage;

      const [total, parks] = await Promise.all([
        prisma.park.count({ where }),
        prisma.park.findMany({
          where,
          skip,
          take: query.perPage,
          orderBy: [{ province: "asc" }, { nameTh: "asc" }],
          select: {
            id: true,
            slug: true,
            nameTh: true,
            nameEn: true,
            province: true,
            region: true,
            latitude: true,
            longitude: true,
            openTime: true,
            closeTime: true,
            description: true,
            coverImageUrl: true,
          },
        }),
      ]);

      if (total > 0) {
        return {
          data: parks.map(mapParkToListDto),
          meta: {
            page: query.page,
            perPage: query.perPage,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / query.perPage),
          },
        };
      }
    } catch (error) {
      console.warn("[park-service] Database query failed, using in-memory seed fallback for listParks:", error);
    }
  }

  const search = query.q?.trim().toLowerCase();
  let filtered = fallbackParks.filter((p) => p.isActive);

  if (query.province) {
    filtered = filtered.filter((p) => p.province === query.province);
  }

  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.nameTh.toLowerCase().includes(search) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(search)) ||
        p.province.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.attractions.some(
          (att) =>
            att.name.toLowerCase().includes(search) ||
            att.description.toLowerCase().includes(search)
        )
    );
  }

  filtered.sort((a, b) => a.province.localeCompare(b.province) || a.nameTh.localeCompare(b.nameTh));

  const total = filtered.length;
  const skip = (query.page - 1) * query.perPage;
  const paged = filtered.slice(skip, skip + query.perPage);

  return {
    data: paged.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameTh: p.nameTh,
      nameEn: p.nameEn,
      province: p.province,
      region: p.region,
      latitude: p.latitude,
      longitude: p.longitude,
      openTime: p.openTime,
      closeTime: p.closeTime,
      description: p.description,
      coverImageUrl: p.coverImageUrl,
    })),
    meta: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.perPage),
    },
  };
}

export async function getParkDetail(idOrSlug: string): Promise<ParkDetailDto> {
  if (typeof prisma?.park?.findFirst === "function") {
    try {
      const park = await prisma.park.findFirst({
        where: {
          isActive: true,
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        },
        include: {
          attractions: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              imageUrl: true,
            },
            orderBy: [{ createdAt: "asc" }],
          },
          warnings: {
            select: {
              id: true,
              title: true,
              description: true,
              severity: true,
              isActive: true,
            },
            where: {
              isActive: true,
            },
            orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
          },
        },
      });

      if (park) {
        return mapParkToDetailDto(park);
      }
    } catch (error) {
      console.warn("[park-service] Database query failed, using in-memory seed fallback for getParkDetail:", error);
    }
  }

  const park = fallbackParks.find(
    (p) => p.isActive && (p.id === idOrSlug || p.slug === idOrSlug)
  );

  if (!park) {
    throw new NotFoundError("Park not found");
  }

  return mapParkToDetailDto(park as unknown as Parameters<typeof mapParkToDetailDto>[0]);
}

export type SuggestedParksResult = {
  type: "didYouMean" | "popular";
  parks: ParkListItemDto[];
  matchedKeyword?: string;
};

export async function getSuggestedOrPopularParks(query?: ParkListQuery): Promise<SuggestedParksResult> {
  const rawSearch = query?.q?.trim();

  // Try extracting meaningful search tokens by removing generic prefixes
  if (rawSearch) {
    const cleanedSearch = rawSearch
      .replace(/อุทยานแห่งชาติ|อุทยาน|แห่งชาติ|น้ำตก|ยอดดอย|ดอย|ภู|ลานกางเต็นท์|ลานกางเต้นท์|กางเต็นท์|กางเต้นท์|ที่เที่ยว|เที่ยว|ป่า/g, "")
      .trim();

    if (cleanedSearch && cleanedSearch.length >= 2 && cleanedSearch !== rawSearch) {
      const suggestedResult = await listParks({
        q: cleanedSearch,
        province: query?.province,
        page: 1,
        perPage: 4,
      });

      if (suggestedResult.data.length > 0) {
        return {
          type: "didYouMean",
          parks: suggestedResult.data,
          matchedKeyword: cleanedSearch,
        };
      }
    }
  }

  // If no "Did you mean" match, fetch popular/curated northern parks
  const popularSlugs = [
    "doi-inthanon",
    "phu-soi-dao",
    "wiang-kosai",
    "namtok-mae-surin",
    "salawin",
    "ton-sak-yai",
    "lam-nam-nan",
  ];

  if (typeof prisma?.park?.findMany === "function") {
    try {
      const parks = await prisma.park.findMany({
        where: {
          isActive: true,
          slug: { in: popularSlugs },
        },
        take: 4,
        select: {
          id: true,
          slug: true,
          nameTh: true,
          nameEn: true,
          province: true,
          region: true,
          latitude: true,
          longitude: true,
          openTime: true,
          closeTime: true,
          description: true,
          coverImageUrl: true,
        },
      });

      if (parks.length > 0) {
        return {
          type: "popular",
          parks: parks.map(mapParkToListDto),
        };
      }
    } catch (error) {
      console.warn("[park-service] Failed to query popular parks, using fallback:", error);
    }
  }

  const fallbackPopular = fallbackParks
    .filter((p) => p.isActive && popularSlugs.includes(p.slug))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      nameTh: p.nameTh,
      nameEn: p.nameEn,
      province: p.province,
      region: p.region,
      latitude: p.latitude,
      longitude: p.longitude,
      openTime: p.openTime,
      closeTime: p.closeTime,
      description: p.description,
      coverImageUrl: p.coverImageUrl,
    }));

  return {
    type: "popular",
    parks: fallbackPopular,
  };
}
