import type { TransportMode, WeatherCondition } from "@prisma/client";

export type ValidationIssue = {
  field: string;
  message: string;
  code: string;
};

export class RequestValidationError extends Error {
  constructor(public readonly details: ValidationIssue[]) {
    super("Request validation failed");
    this.name = "RequestValidationError";
  }
}

export type TripCreateInput = {
  parkId: string;
  tripDate: Date;
  departAt: string;
  originText: string;
  originLat?: number;
  originLng?: number;
  transportMode: TransportMode;
  travelerCount: number;
  weatherCondition: WeatherCondition;
  estimatedTravelMinutes: number;
  mockSunsetTime?: string;
  notes?: string;
};

const TRANSPORT_MODES = ["CAR", "MOTORCYCLE", "PUBLIC_TRANSPORT", "OTHER"] as const;
const WEATHER_CONDITIONS = ["CLEAR", "CLOUDY", "LIGHT_RAIN", "HEAVY_RAIN", "STORM"] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isTransportMode(value: string): value is TransportMode {
  return (TRANSPORT_MODES as readonly string[]).includes(value);
}

function isWeatherCondition(value: string): value is WeatherCondition {
  return (WEATHER_CONDITIONS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDate(field: string, value: unknown, issues: ValidationIssue[]): Date | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({
      field,
      message: "Must be a non-empty date string",
      code: "invalid_type",
    });
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    issues.push({
      field,
      message: "Must be a valid date",
      code: "invalid_date",
    });
    return undefined;
  }

  return parsedDate;
}

function parseTime(field: string, value: unknown, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    issues.push({
      field,
      message: "Must use HH:MM format",
      code: "invalid_format",
    });
    return undefined;
  }

  return value;
}

function parsePositiveInteger(
  field: string,
  value: unknown,
  issues: ValidationIssue[],
  minimum = 1,
): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    issues.push({
      field,
      message: `Must be an integer greater than or equal to ${minimum}`,
      code: "out_of_range",
    });
    return undefined;
  }

  return value;
}

function parseEnum<T extends readonly string[]>(
  field: string,
  value: unknown,
  allowedValues: T,
  issues: ValidationIssue[],
): T[number] | undefined {
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    issues.push({
      field,
      message: `Must be one of: ${allowedValues.join(", ")}`,
      code: "invalid_enum",
    });
    return undefined;
  }

  return value;
}

function parseOptionalString(
  field: string,
  value: unknown,
  issues: ValidationIssue[],
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    issues.push({
      field,
      message: "Must be a string",
      code: "invalid_type",
    });
    return undefined;
  }

  return value.trim();
}

function parseOptionalCoordinate(
  field: string,
  value: unknown,
  issues: ValidationIssue[],
  minimum: number,
  maximum: number,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value) || value < minimum || value > maximum) {
    issues.push({
      field,
      message: `Must be a number between ${minimum} and ${maximum}`,
      code: "out_of_range",
    });
    return undefined;
  }

  return value;
}

export function parseTripCreateInput(input: unknown): TripCreateInput {
  if (!isRecord(input)) {
    throw new RequestValidationError([
      {
        field: "body",
        message: "Request body must be a JSON object",
        code: "invalid_type",
      },
    ]);
  }

  const issues: ValidationIssue[] = [];
  const parkId =
    typeof input.parkId === "string" && input.parkId.trim().length > 0
      ? input.parkId.trim()
      : (() => {
          issues.push({
            field: "parkId",
            message: "Park id is required",
            code: "required",
          });
          return undefined;
        })();
  const tripDate = parseDate("tripDate", input.tripDate, issues);
  const departAt = parseTime("departAt", input.departAt, issues);
  const originText =
    typeof input.originText === "string" && input.originText.trim().length > 0
      ? input.originText.trim()
      : (() => {
          issues.push({
            field: "originText",
            message: "Origin text is required",
            code: "required",
          });
          return undefined;
        })();
  const originLat = parseOptionalCoordinate("originLat", input.originLat, issues, -90, 90);
  const originLng = parseOptionalCoordinate("originLng", input.originLng, issues, -180, 180);
  const transportModeRaw = parseEnum("transportMode", input.transportMode, TRANSPORT_MODES, issues);
  const travelerCount = parsePositiveInteger("travelerCount", input.travelerCount, issues);
  const weatherConditionRaw = parseEnum(
    "weatherCondition",
    input.weatherCondition,
    WEATHER_CONDITIONS,
    issues,
  );
  const estimatedTravelMinutes = parsePositiveInteger(
    "estimatedTravelMinutes",
    input.estimatedTravelMinutes,
    issues,
  );
  const mockSunsetTime = parseOptionalString("mockSunsetTime", input.mockSunsetTime, issues);
  const notes = parseOptionalString("notes", input.notes, issues);

  if (mockSunsetTime !== undefined) {
    parseTime("mockSunsetTime", mockSunsetTime, issues);
  }

  const transportMode = transportModeRaw && isTransportMode(transportModeRaw) ? transportModeRaw : undefined;
  const weatherCondition =
    weatherConditionRaw && isWeatherCondition(weatherConditionRaw) ? weatherConditionRaw : undefined;

  if (
    issues.length > 0 ||
    !parkId ||
    !tripDate ||
    !departAt ||
    !originText ||
    !transportMode ||
    !travelerCount ||
    !weatherCondition ||
    !estimatedTravelMinutes
  ) {
    throw new RequestValidationError(issues);
  }

  return {
    parkId,
    tripDate,
    departAt,
    originText,
    ...(originLat !== undefined ? { originLat } : {}),
    ...(originLng !== undefined ? { originLng } : {}),
    transportMode,
    travelerCount,
    weatherCondition,
    estimatedTravelMinutes,
    ...(mockSunsetTime ? { mockSunsetTime } : {}),
    ...(notes ? { notes } : {}),
  };
}
