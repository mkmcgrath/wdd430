export type FieldErrors = Record<string, string[]>;

/** An expected failure, sent to the client as RFC 9457 problem JSON. */
export class ApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 409 | 413 | 415 | 429,
    readonly title: string,
    readonly detail: string,
    readonly errors?: FieldErrors,
    readonly code?: string,
  ) {
    super(detail);
  }
}

export function validationError(errors: FieldErrors): ApiError {
  return new ApiError(400, "Validation failed", "One or more fields are invalid.", errors);
}

export function unauthorized(code: "unauthenticated" | "session_expired" = "unauthenticated"): ApiError {
  return new ApiError(401, "Unauthorized", "Sign in to continue.", undefined, code);
}

export function notFound(detail = "This item doesn't exist or was deleted."): ApiError {
  return new ApiError(404, "Not found", detail);
}

export function conflict(detail: string, field: string): ApiError {
  return new ApiError(409, "Conflict", detail, { [field]: [detail] });
}

export function tooManyRequests(detail: string): ApiError {
  return new ApiError(429, "Too many requests", detail);
}
