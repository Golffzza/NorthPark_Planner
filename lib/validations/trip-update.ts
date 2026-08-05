import type { TransportMode, WeatherCondition } from "@prisma/client";

import { RequestValidationError, type ValidationIssue } from "@/lib/validations/trip-create";

export type TripUpdateInput = {
  parkId?: string;
  tripDate?: Date;
  departAt?: string;
  originText?: string;
  originLat?: number | null;
  originLng?: number | null;
  transportMode?: TransportMode;
  travelerCount?: number;
  weatherCondition?: WeatherCondition;
  estimatedTravelMinutes?: number;
  mockSunsetTime?: string;
  notes?: string;
};

const TRANSPORT_MODES = ["CAR", "MOTORCYCLE", "PUBLIC_TRANSPORT", "OTHER"] as const;
const WEATHER_CONDITIONS = ["CLEAR", "CLOUDY", "LIGHT_RAIN", "HEAVY_RAIN", "STORM"] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isTransportMode(value: string): value is TransportMode {
  return (TRANSPORT_MODES as readonly string[]).includes(value);
}

function parseCoordinateUpdate(
  field: string,
  value: unknown,
  issues: ValidationIssue[],
  minimum: number,
  maximum: number,
): number | null | undefined {
  if (value === null || value === "") {
    return null;
  }

  if (value === undefined) {
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

function isWeatherCondition(value: string): value is WeatherCondition {
  return (WEATHER_CONDITIONS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTripUpdateInput(input: unknown): TripUpdateInput {
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
  const parsed: TripUpdateInput = {};

  if (Object.keys(input).length === 0) {
    throw new RequestValidationError([
      {
        field: "body",
        message: "At least one field is required",
        code: "required",
      },
    ]);
  }

  if ("parkId" in input) {
    if (typeof input.parkId !== "string" || input.parkId.trim().length === 0) {
      issues.push({ field: "parkId", message: "กรุณาเลือกอุทยานแห่งชาติปลายทาง", code: "required" });
    } else {
      parsed.parkId = input.parkId.trim();
    }
  }

  if ("tripDate" in input) {
    if (typeof input.tripDate !== "string" || input.tripDate.trim().length === 0) {
      issues.push({ field: "tripDate", message: "กรุณากำหนดวันที่เดินทาง", code: "invalid_type" });
    } else {
      const tripDate = new Date(input.tripDate);
      if (Number.isNaN(tripDate.getTime())) {
        issues.push({ field: "tripDate", message: "วันที่เดินทางไม่ถูกต้อง", code: "invalid_date" });
      } else {
        parsed.tripDate = tripDate;
      }
    }
  }

  if ("departAt" in input) {
    if (typeof input.departAt !== "string" || !TIME_PATTERN.test(input.departAt)) {
      issues.push({ field: "departAt", message: "กรุณาระบุเวลาในรูปแบบ HH:MM (เช่น 07:00)", code: "invalid_format" });
    } else {
      parsed.departAt = input.departAt;
    }
  }

  if ("originText" in input) {
    if (typeof input.originText !== "string" || input.originText.trim().length === 0) {
      issues.push({ field: "originText", message: "กรุณาระบุจุดเริ่มต้นเดินทาง", code: "required" });
    } else {
      parsed.originText = input.originText.trim();
    }
  }

  if ("originLat" in input) {
    const originLat = parseCoordinateUpdate("originLat", input.originLat, issues, -90, 90);
    if (originLat !== undefined) {
      parsed.originLat = originLat;
    }
  }

  if ("originLng" in input) {
    const originLng = parseCoordinateUpdate("originLng", input.originLng, issues, -180, 180);
    if (originLng !== undefined) {
      parsed.originLng = originLng;
    }
  }

  if ("transportMode" in input) {
    if (typeof input.transportMode !== "string" || !isTransportMode(input.transportMode)) {
      issues.push({
        field: "transportMode",
        message: `Must be one of: ${TRANSPORT_MODES.join(", ")}`,
        code: "invalid_enum",
      });
    } else {
      parsed.transportMode = input.transportMode;
    }
  }

  if ("travelerCount" in input) {
    if (typeof input.travelerCount !== "number" || !Number.isInteger(input.travelerCount) || input.travelerCount < 1) {
      issues.push({
        field: "travelerCount",
        message: "Must be an integer greater than or equal to 1",
        code: "out_of_range",
      });
    } else {
      parsed.travelerCount = input.travelerCount;
    }
  }

  if ("weatherCondition" in input) {
    if (typeof input.weatherCondition !== "string" || !isWeatherCondition(input.weatherCondition)) {
      issues.push({
        field: "weatherCondition",
        message: `Must be one of: ${WEATHER_CONDITIONS.join(", ")}`,
        code: "invalid_enum",
      });
    } else {
      parsed.weatherCondition = input.weatherCondition;
    }
  }

  if ("estimatedTravelMinutes" in input) {
    if (
      typeof input.estimatedTravelMinutes !== "number" ||
      !Number.isInteger(input.estimatedTravelMinutes) ||
      input.estimatedTravelMinutes < 1
    ) {
      issues.push({
        field: "estimatedTravelMinutes",
        message: "Must be an integer greater than or equal to 1",
        code: "out_of_range",
      });
    } else {
      parsed.estimatedTravelMinutes = input.estimatedTravelMinutes;
    }
  }

  if ("mockSunsetTime" in input) {
    if (input.mockSunsetTime === null || input.mockSunsetTime === "") {
      parsed.mockSunsetTime = "";
    } else if (typeof input.mockSunsetTime !== "string" || !TIME_PATTERN.test(input.mockSunsetTime)) {
      issues.push({
        field: "mockSunsetTime",
        message: "Must use HH:MM format",
        code: "invalid_format",
      });
    } else {
      parsed.mockSunsetTime = input.mockSunsetTime;
    }
  }

  if ("notes" in input) {
    if (input.notes === null || input.notes === "") {
      parsed.notes = "";
    } else if (typeof input.notes !== "string") {
      issues.push({
        field: "notes",
        message: "Must be a string",
        code: "invalid_type",
      });
    } else {
      parsed.notes = input.notes.trim();
    }
  }

  if (issues.length > 0) {
    throw new RequestValidationError(issues);
  }

  return parsed;
}
