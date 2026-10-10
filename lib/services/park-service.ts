import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  mapParkToDetailDto,
  mapParkToListDto,
  type ParkDetailDto,
  type ParkListItemDto,
  type ParkOptionDto,
} from "@/lib/mappers/park-dto";
import type { ParkListQuery } from "@/lib/validations/park-query";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export type ParkOption = ParkOptionDto;

export type ParkSuggestionResult = {
  type: "didYouMean" | "popular";
  matchedKeyword?: string;
  parks: ParkListItemDto[];
};

export type ParkListResult = {
  data: ParkListItemDto[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export async function listParkProvinces(): Promise<string[]> {
  const parks = await prisma.park.findMany({
    where: { isActive: true },
    select: { province: true },
    distinct: ["province"],
    orderBy: { province: "asc" },
  });

  return parks.map((park) => park.province);
}

export async function listParkOptions(): Promise<ParkOptionDto[]> {
  const parks = await prisma.park.findMany({
    where: { isActive: true },
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

export async function getParkDetail(idOrSlug: string): Promise<ParkDetailDto> {
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
        where: { isActive: true },
        orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!park) {
    throw new NotFoundError("Park not found");
  }

  return mapParkToDetailDto(park);
}

export async function getSuggestedOrPopularParks(
  query?: ParkListQuery,
): Promise<ParkSuggestionResult> {
  const rawSearch = query?.q?.trim();

  if (rawSearch) {
    const cleanedSearch = rawSearch
      .replace(/อุทยานแห่งชาติ|อุทยาน|แห่งชาติ|น้ำตก|ยอดดอย|ดอย|ภู|ลานกางเต็นท์|ลานกางเต้นท์|กางเต็นท์|กางเต้นท์|ที่เที่ยว|เที่ยว|ป่า/g, "")
      .trim();

    if (cleanedSearch.length >= 2 && cleanedSearch !== rawSearch) {
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

  const popularSlugs = [
    "doi-inthanon",
    "phu-soi-dao",
    "wiang-kosai",
    "namtok-mae-surin",
    "salawin",
    "ton-sak-yai",
    "lam-nam-nan",
  ];
  const parks = await prisma.park.findMany({
    where: { isActive: true, slug: { in: popularSlugs } },
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

  return { type: "popular", parks: parks.map(mapParkToListDto) };
}
