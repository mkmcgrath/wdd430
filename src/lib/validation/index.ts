import { z } from "zod";
import { ValidationError, type FieldErrors } from "@/lib/errors";

/**
 * Parse input with a zod schema, or throw a ValidationError whose `errors`
 * are keyed by field name (convention C2).
 */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const flat = z.flattenError(result.error);
    const errors: FieldErrors = {};
    for (const [field, messages] of Object.entries(flat.fieldErrors)) {
      if (Array.isArray(messages) && messages.length > 0) errors[field] = messages as string[];
    }
    if (flat.formErrors.length > 0) errors._ = flat.formErrors;
    throw new ValidationError(errors);
  }
  return result.data;
}

/** Route IDs are positive integers; anything else is treated as "not found". */
export function parseId(value: string): number | null {
  if (!/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}
