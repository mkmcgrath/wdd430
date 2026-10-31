import { decoyHash, hashPassword, verifyPassword } from "../auth";
import { isUniqueViolation, one, run } from "../db";
import { conflict, ApiError, unauthorized, validationError } from "../errors";
import { loginSchema, parse, passwordChangeSchema, profileSchema, registerSchema } from "../validation";

export type User = { id: number; name: string; email: string; createdAt: string };

type UserRow = { id: number; name: string; email: string; password_hash: string; created_at: string };

const EMAIL_TAKEN = "An account with this email already exists.";

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

export function getUser(id: number): User | null {
  const row = one<UserRow>("SELECT * FROM users WHERE id = ?", id);
  return row ? toUser(row) : null;
}

export async function register(input: unknown): Promise<User> {
  const { name, email, password } = parse(registerSchema, input);
  const passwordHash = await hashPassword(password);
  const createdAt = new Date().toISOString();
  try {
    const { lastInsertRowid } = run(
      "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
      name,
      email,
      passwordHash,
      createdAt,
    );
    return { id: Number(lastInsertRowid), name, email, createdAt };
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict(EMAIL_TAKEN, "email");
    throw error;
  }
}

export async function authenticate(input: unknown): Promise<User> {
  const { email, password } = parse(loginSchema, input);
  const row = one<UserRow>("SELECT * FROM users WHERE email = ?", email);
  const valid = await verifyPassword(password, row?.password_hash ?? decoyHash);
  if (!row || !valid) {
    throw new ApiError(401, "Unauthorized", "Incorrect email or password.", undefined, "invalid_credentials");
  }
  return toUser(row);
}

export function updateProfile(userId: number, input: unknown): User {
  const { name, email } = parse(profileSchema, input);
  try {
    run("UPDATE users SET name = ?, email = ? WHERE id = ?", name, email, userId);
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict(EMAIL_TAKEN, "email");
    throw error;
  }
  const user = getUser(userId);
  if (!user) throw unauthorized();
  return user;
}

/** A wrong current password is a 400, not a 401, because 401 means the session ended. */
export async function changePassword(userId: number, input: unknown): Promise<void> {
  const { currentPassword, newPassword } = parse(passwordChangeSchema, input);
  const row = one<UserRow>("SELECT * FROM users WHERE id = ?", userId);
  if (!row) throw unauthorized();
  if (!(await verifyPassword(currentPassword, row.password_hash))) {
    throw validationError({ currentPassword: ["Current password is incorrect."] });
  }
  run("UPDATE users SET password_hash = ? WHERE id = ?", await hashPassword(newPassword), userId);
}
