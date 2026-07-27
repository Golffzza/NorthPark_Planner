import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { mapParkToDetailDto, mapParkToListDto, type ParkDetailDto, type ParkListItemDto } from "@/lib/mappers/park-dto";
import type { ParkListQuery } from "@/lib/validations/park-query";

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
  province: string;
  latitude: number | null;
  longitude: number | null;
};

export async function listParkProvinces(): Promise<string[]> {
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

  return parks.map((park) => park.province);
}

export async function listParkOptions(): Promise<ParkOption[]> {
  const parks = await prisma.park.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ province: "asc" }, { nameTh: "asc" }],
    select: {
      id: true,
      slug: true,
      nameTh: true,
      province: true,
      latitude: true,
      longitude: true,
    },
  });

  return parks.map((park) => ({
    id: park.id,
    slug: park.slug,
    nameTh: park.nameTh,
    province: park.province,
    latitude: park.latitude === null ? null : Number(park.latitude),
    longitude: park.longitude === null ? null : Number(park.longitude),
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
        where: {
          isActive: true,
        },
        orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!park) {
    throw new NotFoundError("Park not found");
  }

  return mapParkToDetailDto(park);
}
