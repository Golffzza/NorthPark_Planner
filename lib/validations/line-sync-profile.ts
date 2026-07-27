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

export type SyncProfileInput = {
  idToken?: string;
  profile?: {
    userId: string;
    displayName?: string;
    pictureUrl?: string;
    statusMessage?: string;
    language?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseSyncProfileInput(input: unknown): SyncProfileInput {
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
  const idToken = parseOptionalString(input.idToken);
  let profile: SyncProfileInput["profile"];

  if (input.profile !== undefined) {
    if (!isRecord(input.profile)) {
      issues.push({
        field: "profile",
        message: "Profile must be an object",
        code: "invalid_type",
      });
    } else {
      const userId = parseOptionalString(input.profile.userId);

      if (!userId) {
        issues.push({
          field: "profile.userId",
          message: "Profile userId is required when profile is provided",
          code: "required",
        });
      } else {
        profile = {
          userId,
          ...(parseOptionalString(input.profile.displayName)
            ? { displayName: parseOptionalString(input.profile.displayName) }
            : {}),
          ...(parseOptionalString(input.profile.pictureUrl)
            ? { pictureUrl: parseOptionalString(input.profile.pictureUrl) }
            : {}),
          ...(parseOptionalString(input.profile.statusMessage)
            ? { statusMessage: parseOptionalString(input.profile.statusMessage) }
            : {}),
          ...(parseOptionalString(input.profile.language)
            ? { language: parseOptionalString(input.profile.language) }
            : {}),
        };
      }
    }
  }

  if (!idToken && !profile) {
    issues.push({
      field: "idToken",
      message: "Either idToken or profile.userId is required",
      code: "required",
    });
  }

  if (issues.length > 0) {
    throw new RequestValidationError(issues);
  }

  return {
    ...(idToken ? { idToken } : {}),
    ...(profile ? { profile } : {}),
  };
}
