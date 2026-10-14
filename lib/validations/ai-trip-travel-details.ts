import { z } from "zod";

import { RequestValidationError } from "@/lib/validations/trip-create";

const optional = <T extends z.ZodType>(schema: T) => z.preprocess(
  (value) => value === null || (typeof value === "string" && value.trim() === "") ? undefined : value,
  schema.optional(),
);

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

const schema = z.object({
  tripDate: optional(date),
  departAt: optional(time),
  originText: optional(z.string().trim().min(1).max(300)),
  originLat: optional(z.number().finite().min(-90).max(90)),
  originLng: optional(z.number().finite().min(-180).max(180)),
  transportMode: optional(z.enum(["CAR", "MOTORCYCLE", "PUBLIC_TRANSPORT", "OTHER"])),
  travelerCount: optional(z.number().int().min(1)),
  weatherCondition: optional(z.enum(["CLEAR", "CLOUDY", "LIGHT_RAIN", "HEAVY_RAIN", "STORM"])),
  estimatedTravelMinutes: optional(z.number().int().min(1)),
  mockSunsetTime: optional(time),
  notes: optional(z.string().trim().max(2000)),
}).strict().superRefine((details, context) => {
  const hasLat = details.originLat !== undefined;
  const hasLng = details.originLng !== undefined;
  if (hasLat !== hasLng) {
    context.addIssue({ code: "custom", path: [hasLat ? "originLng" : "originLat"], message: "Both origin coordinates are required together" });
  }
  if (hasLat && !details.originText) {
    context.addIssue({ code: "custom", path: ["originText"], message: "Origin name is required with coordinates" });
  }
});

export type AiTripTravelDetails = Omit<z.infer<typeof schema>, "tripDate"> & { tripDate?: Date };

export function parseAiTripTravelDetails(input: unknown): AiTripTravelDetails {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new RequestValidationError(parsed.error.issues.map((issue) => ({
      field: issue.path.join(".") || "travelDetails",
      message: issue.message,
      code: issue.code,
    })));
  }
  const { tripDate, ...rest } = parsed.data;
  return { ...rest, ...(tripDate ? { tripDate: new Date(`${tripDate}T00:00:00.000Z`) } : {}) };
}
