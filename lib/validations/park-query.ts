export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export type ParkListQuery = {
  q?: string;
  province?: string;
  page: number;
  perPage: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 50;

function parsePositiveInteger(value: string | null, field: string, fallback: number): number {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestError(`${field} must be a positive integer`);
  }

  return parsed;
}

export function parseParkListQuery(searchParams: URLSearchParams): ParkListQuery {
  const page = parsePositiveInteger(searchParams.get("page"), "page", DEFAULT_PAGE);
  const perPage = parsePositiveInteger(searchParams.get("perPage"), "perPage", DEFAULT_PER_PAGE);

  if (perPage > MAX_PER_PAGE) {
    throw new BadRequestError(`perPage must be less than or equal to ${MAX_PER_PAGE}`);
  }

  const q = searchParams.get("q")?.trim();
  const province = searchParams.get("province")?.trim();

  return {
    ...(q ? { q } : {}),
    ...(province ? { province } : {}),
    page,
    perPage,
  };
}
