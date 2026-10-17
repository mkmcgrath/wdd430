// Application errors. Each maps to one status code in the RFC 9457 problem
// shape (convention C2). Services throw these; route handlers and server
// actions translate them for their callers.

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
    public readonly errors?: FieldErrors,
  ) {
    super(detail ?? title);
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldErrors, detail = "One or more fields are invalid.") {
    super(400, "Validation failed", detail, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail = "You need to sign in.") {
    super(401, "Unauthorized", detail);
  }
}

export class NotFoundError extends AppError {
  constructor(detail = "The requested item doesn't exist.") {
    super(404, "Not found", detail);
  }
}

export class ConflictError extends AppError {
  constructor(detail: string, field?: string) {
    super(409, "Conflict", detail, field ? { [field]: [detail] } : undefined);
  }
}

export class RateLimitError extends AppError {
  constructor(detail = "Too many requests. Wait a minute and try again.") {
    super(429, "Too many requests", detail);
  }
}
