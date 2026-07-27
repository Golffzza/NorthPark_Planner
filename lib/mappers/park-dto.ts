import type { Prisma } from "@prisma/client";

export type ParkListItemDto = {
  id: string;
  slug: string;
  nameTh: string;
  nameEn: string | null;
  province: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  openTime: string;
  closeTime: string;
  description: string;
  coverImageUrl: string | null;
};

export type ParkDetailDto = ParkListItemDto & {
  attractions: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    imageUrl: string | null;
  }[];
  warnings: {
    id: string;
    title: string;
    description: string;
    severity: string;
  }[];
};

type ParkListRecord = Prisma.ParkGetPayload<{
  select: {
    id: true;
    slug: true;
    nameTh: true;
    nameEn: true;
    province: true;
    region: true;
    latitude: true;
    longitude: true;
    openTime: true;
    closeTime: true;
    description: true;
    coverImageUrl: true;
  };
}>;

type ParkDetailRecord = Prisma.ParkGetPayload<{
  include: {
    attractions: {
      select: {
        id: true;
        name: true;
        description: true;
        type: true;
        imageUrl: true;
      };
    };
    warnings: {
      select: {
        id: true;
        title: true;
        description: true;
        severity: true;
        isActive: true;
      };
    };
  };
}>;

function decimalToNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null) {
    return null;
  }

  return typeof value === "number" ? value : value.toNumber();
}

export function mapParkToListDto(park: ParkListRecord): ParkListItemDto {
  return {
    id: park.id,
    slug: park.slug,
    nameTh: park.nameTh,
    nameEn: park.nameEn,
    province: park.province,
    region: park.region,
    latitude: decimalToNumber(park.latitude),
    longitude: decimalToNumber(park.longitude),
    openTime: park.openTime,
    closeTime: park.closeTime,
    description: park.description,
    coverImageUrl: park.coverImageUrl,
  };
}

export function mapParkToDetailDto(park: ParkDetailRecord): ParkDetailDto {
  return {
    id: park.id,
    slug: park.slug,
    nameTh: park.nameTh,
    nameEn: park.nameEn,
    province: park.province,
    region: park.region,
    latitude: decimalToNumber(park.latitude),
    longitude: decimalToNumber(park.longitude),
    openTime: park.openTime,
    closeTime: park.closeTime,
    description: park.description,
    coverImageUrl: park.coverImageUrl,
    attractions: park.attractions.map((attraction) => ({
      id: attraction.id,
      name: attraction.name,
      description: attraction.description,
      type: attraction.type,
      imageUrl: attraction.imageUrl,
    })),
    warnings: park.warnings
      .filter((warning) => warning.isActive)
      .map((warning) => ({
        id: warning.id,
        title: warning.title,
        description: warning.description,
        severity: warning.severity,
      })),
  };
}
