import { parksData } from "./parks-raw";
import { parksData as correctedCoordinates } from "./parksData_corrected_coordinates";

type RawPark = {
  name: string;
  nameEn: string;
  description: string;
  province: string;
  district?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  entryFeeThai?: number;
  entryFeeForeigner?: number;
  openingHours: string;
  tags?: string[];
};

const curatedOverrides: Record<
  string,
  {
    slug?: string;
    coverImageUrl?: string;
    attractions?: Array<{
      name: string;
      description: string;
      type: "VIEWPOINT" | "WATERFALL" | "TRAIL" | "CAMPSITE" | "OTHER";
      imageUrl?: string;
    }>;
    warnings?: Array<{
      title: string;
      description: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      isActive: boolean;
    }>;
  }
> = {
  "Doi Inthanon National Park": {
    slug: "doi-inthanon",
    coverImageUrl: "/images/parks/doi-inthanon.jpg",
    attractions: [
      {
        name: "Kew Mae Pan Nature Trail",
        description: "A panoramic mountain trail known for sunrise views and cool-season scenery.",
        type: "TRAIL",
        imageUrl: "/images/attractions/kew-mae-pan.jpg",
      },
      {
        name: "Wachirathan Waterfall",
        description: "A large year-round waterfall popular with visitors.",
        type: "WATERFALL",
        imageUrl: "/images/attractions/wachirathan.jpg",
      },
    ],
    warnings: [
      {
        title: "Slippery surfaces during rainy weather",
        description: "Trails and waterfall paths may become slippery after rain.",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Doi Suthep-Pui National Park": {
    slug: "doi-suthep-pui",
    coverImageUrl: "/images/parks/doi-suthep-pui.jpg",
    attractions: [
      {
        name: "Mon Tha Than Waterfall",
        description: "A forest waterfall area with easy access from the main road.",
        type: "WATERFALL",
        imageUrl: "/images/attractions/mon-tha-than.jpg",
      },
    ],
    warnings: [
      {
        title: "Steep mountain roads",
        description: "Drive carefully on winding roads, especially during foggy mornings.",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Huai Nam Dang National Park": {
    slug: "huai-nam-dang",
    coverImageUrl: "/images/parks/huai-nam-dang.jpg",
    attractions: [
      {
        name: "Huai Nam Dang Viewpoint",
        description: "A popular scenic viewpoint for sunrise and mist-filled valleys.",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/huai-nam-dang-viewpoint.jpg",
      },
      {
        name: "Campground Area",
        description: "A cool-weather campsite with open mountain views.",
        type: "CAMPSITE",
        imageUrl: "/images/attractions/huai-nam-dang-camp.jpg",
      },
    ],
    warnings: [
      {
        title: "Low visibility at dawn",
        description: "Fog can reduce visibility on roads and viewpoints early in the morning.",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Sri Lanna National Park": {
    slug: "si-lanna",
    coverImageUrl: "/images/parks/si-lanna.jpg",
    attractions: [
      {
        name: "Mae Ngat Reservoir View",
        description: "A lakeside scenic area suitable for light sightseeing.",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/mae-ngat-view.jpg",
      },
    ],
    warnings: [],
  },
  "Mae Wang National Park": {
    slug: "mae-wang",
    coverImageUrl: "/images/parks/mae-wang.jpg",
    attractions: [
      {
        name: "Mae Wang Waterfall",
        description: "A refreshing waterfall zone surrounded by forest.",
        type: "WATERFALL",
        imageUrl: "/images/attractions/mae-wang-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "Flashy stream conditions after rain",
        description: "Water levels can rise quickly during heavy rainfall periods.",
        severity: "HIGH",
        isActive: true,
      },
    ],
  },
  "Ob Luang National Park": {
    slug: "ob-luang",
    coverImageUrl: "/images/parks/ob-luang.jpg",
    attractions: [
      {
        name: "Ob Luang Gorge Bridge",
        description: "A signature viewpoint over the narrow gorge and river below.",
        type: "VIEWPOINT",
        imageUrl: "/images/attractions/ob-luang-gorge.jpg",
      },
    ],
    warnings: [
      {
        title: "Watch footing near cliff edges",
        description: "Some elevated viewpoints require extra caution for children and older visitors.",
        severity: "MEDIUM",
        isActive: true,
      },
    ],
  },
  "Mae Ping National Park": {
    slug: "mae-ping",
    coverImageUrl: "/images/parks/mae-ping.jpg",
    attractions: [
      {
        name: "Ko Luang Waterfall",
        description: "A multi-tier waterfall known for turquoise pools in suitable conditions.",
        type: "WATERFALL",
        imageUrl: "/images/attractions/ko-luang.jpg",
      },
    ],
    warnings: [],
  },
  "Khun Chae National Park": {
    slug: "khun-chae",
    coverImageUrl: "/images/parks/khun-chae.jpg",
    attractions: [
      {
        name: "Khun Chae Waterfall",
        description: "A tall waterfall accessed through a short forest approach.",
        type: "WATERFALL",
        imageUrl: "/images/attractions/khun-chae-waterfall.jpg",
      },
    ],
    warnings: [
      {
        title: "Roadside parking is limited",
        description: "Plan arrival time carefully during busy travel periods.",
        severity: "LOW",
        isActive: true,
      },
    ],
  },
};

const keywordAttractionTypes = [
  { keywords: ["waterfall", "namtok", "water fall"], type: "WATERFALL" as const },
  { keywords: ["trail", "trek", "hiking", "forest"], type: "TRAIL" as const },
  { keywords: ["camp", "campsite"], type: "CAMPSITE" as const },
  { keywords: ["view", "doi", "peak", "cliff", "mist", "sea"], type: "VIEWPOINT" as const },
];

const correctedCoordinateMap = new Map(
  (correctedCoordinates as RawPark[]).map((park) => [
    park.nameEn,
    {
      latitude: park.latitude,
      longitude: park.longitude,
    },
  ]),
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/national park/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function resolveSlug(rawPark: RawPark, usedSlugs: Set<string>) {
  const overrideSlug = curatedOverrides[rawPark.nameEn]?.slug;
  let candidate = overrideSlug ?? slugify(rawPark.nameEn || rawPark.name);

  if (!candidate) {
    candidate = `park-${usedSlugs.size + 1}`;
  }

  if (!usedSlugs.has(candidate)) {
    usedSlugs.add(candidate);
    return candidate;
  }

  const provinceSlug = slugify(rawPark.province);
  const withProvince = provinceSlug ? `${candidate}-${provinceSlug}` : `${candidate}-${usedSlugs.size + 1}`;

  if (!usedSlugs.has(withProvince)) {
    usedSlugs.add(withProvince);
    return withProvince;
  }

  let suffix = 2;
  while (usedSlugs.has(`${withProvince}-${suffix}`)) {
    suffix += 1;
  }

  const uniqueSlug = `${withProvince}-${suffix}`;
  usedSlugs.add(uniqueSlug);
  return uniqueSlug;
}

function splitOpeningHours(openingHours: string) {
  const [openTime = "08:00", closeTime = "16:30"] = openingHours.split("-").map((item) => item.trim());
  return { openTime, closeTime };
}

function inferAttractionType(name: string) {
  const normalized = name.toLowerCase();

  for (const matcher of keywordAttractionTypes) {
    if (matcher.keywords.some((keyword) => normalized.includes(keyword))) {
      return matcher.type;
    }
  }

  return "OTHER" as const;
}

function buildAttractions(rawPark: RawPark) {
  const overrideAttractions = curatedOverrides[rawPark.nameEn]?.attractions;

  if (overrideAttractions) {
    return overrideAttractions;
  }

  const tags = rawPark.tags?.filter(Boolean) ?? [];
  const tagAttractions = tags.slice(0, 3).map((tag) => ({
    name: tag,
    description: `Recommended activity highlight for ${rawPark.nameEn}.`,
    type: inferAttractionType(tag),
    imageUrl: undefined,
  }));

  if (tagAttractions.length > 0) {
    return tagAttractions;
  }

  return [
    {
      name: rawPark.nameEn,
      description: `Signature nature stop in ${rawPark.province}.`,
      type: inferAttractionType(rawPark.nameEn),
      imageUrl: undefined,
    },
  ];
}

function buildWarnings(rawPark: RawPark) {
  const overrideWarnings = curatedOverrides[rawPark.nameEn]?.warnings;

  if (overrideWarnings) {
    return overrideWarnings;
  }

  return [];
}

const usedSlugs = new Set<string>();

export const parks = (parksData as RawPark[]).map((rawPark) => {
  const { openTime, closeTime } = splitOpeningHours(rawPark.openingHours);
  const override = curatedOverrides[rawPark.nameEn];
  const correctedCoordinate = correctedCoordinateMap.get(rawPark.nameEn);

  return {
    slug: resolveSlug(rawPark, usedSlugs),
    nameTh: rawPark.name,
    nameEn: rawPark.nameEn,
    province: rawPark.province,
    region: "NORTH" as const,
    latitude: correctedCoordinate?.latitude ?? rawPark.latitude,
    longitude: correctedCoordinate?.longitude ?? rawPark.longitude,
    openTime,
    closeTime,
    description: rawPark.description,
    coverImageUrl: override?.coverImageUrl ?? null,
    isActive: true,
    attractions: buildAttractions(rawPark),
    warnings: buildWarnings(rawPark),
  };
});
