import { z } from "zod";
import { validationError, type FieldErrors } from "./errors";

// All validation limits live here.

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path.length ? String(issue.path[0]) : "form";
    (errors[field] ??= []).push(issue.message);
  }
  throw validationError(errors);
}

const nameField = z
  .string({ error: "Name is required." })
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name must be 100 characters or fewer.");

const emailField = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .max(254, "Email must be 254 characters or fewer.")
  .pipe(z.email("Enter a valid email address."));

const passwordField = z
  .string({ error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});

export const loginSchema = z.object({
  email: z.string({ error: "Email is required." }).trim().toLowerCase().min(1, "Email is required."),
  password: z.string({ error: "Password is required." }).min(1, "Password is required.").max(128),
});

export const profileSchema = z.object({
  name: nameField,
  email: emailField,
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string({ error: "Enter your current password." }).min(1, "Enter your current password."),
    newPassword: passwordField,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from your current password.",
  });

export const MAX_TAGS_PER_ITEM = 10;

export const tagSchema = z.object({
  name: z
    .string({ error: "Tag name is required." })
    .trim()
    .min(1, "Tag name is required.")
    .max(50, "Tag names must be 50 characters or fewer.")
    .refine((name) => !name.includes(","), "Tag names can't contain commas."),
});

/** Case-insensitive key for per-user tag uniqueness. */
export function normalizeTagName(name: string): string {
  return name.trim().toUpperCase();
}

/**
 * Optional tag IDs on saves: null or missing leaves tags unchanged on update,
 * and [] removes them all. Duplicates collapse.
 */
const tagIdsField = z
  .array(z.coerce.number().int().positive(), { error: "Tags must be a list of tag IDs." })
  .transform((ids) => [...new Set(ids)])
  .refine((ids) => ids.length <= MAX_TAGS_PER_ITEM, `An item can have at most ${MAX_TAGS_PER_ITEM} tags.`)
  .nullish();

export const noteSchema = z.object({
  title: z
    .string({ error: "Title is required." })
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or fewer."),
  content: z
    .string({ error: "Content must be text." })
    .transform((text) => text.replace(/\r\n?/g, "\n"))
    .pipe(z.string().max(20_000, "Content must be 20,000 characters or fewer."))
    .default(""),
  tagIds: tagIdsField,
});

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const linkSchema = z
  .object({
    url: z
      .string({ error: "URL is required." })
      .trim()
      .min(1, "URL is required.")
      .max(2048, "URL must be 2,048 characters or fewer.")
      .refine(isHttpUrl, "Enter a full web address starting with http:// or https://"),
    title: z.string().trim().max(200, "Title must be 200 characters or fewer.").nullish(),
    description: z.string().trim().max(1000, "Description must be 1,000 characters or fewer.").nullish(),
    tagIds: tagIdsField,
  })
  .transform((link) => ({
    ...link,
    title: link.title ? link.title : link.url.slice(0, 200),
    description: link.description ? link.description : null,
  }));

export const listQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, "Search text must be 100 characters or fewer.")
    .optional()
    .transform((q) => (q ? q : undefined)),
  tagId: z.coerce.number().int("Tag ID must be a whole number.").positive("Tag ID must be positive.").optional(),
});
