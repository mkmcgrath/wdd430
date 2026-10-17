import { prisma, isUniqueViolation } from "@/lib/db";
import { ConflictError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { parse } from "@/lib/validation";
import { loginSchema, passwordChangeSchema, profileSchema, registerSchema } from "@/lib/validation/schemas";

export type PublicUser = { id: number; name: string; email: string; createdAt: Date };

// Never select the password hash into anything that leaves this module.
const publicUser = { id: true, name: true, email: true, createdAt: true } as const;

const DUPLICATE_EMAIL = "An account with this email already exists.";
export const INVALID_CREDENTIALS = "Invalid email or password.";

/** F2: create an account. */
export async function registerUser(input: unknown): Promise<PublicUser> {
  const data = parse(registerSchema, input);

  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) throw new ConflictError(DUPLICATE_EMAIL, "email");

  const passwordHash = await hashPassword(data.password);
  try {
    return await prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: publicUser,
    });
  } catch (error) {
    // Two simultaneous registrations: the unique index decides (F2 FR-7).
    if (isUniqueViolation(error)) throw new ConflictError(DUPLICATE_EMAIL, "email");
    throw error;
  }
}

/** F3: check credentials. Unknown email and wrong password fail identically. */
export async function authenticate(input: unknown): Promise<PublicUser> {
  const { email, password } = parse(loginSchema, input);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await verifyAgainstDummy(password);
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

export function getUserById(id: number): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUser });
}

/** F4: change name and email. Your own email (any case) is never a conflict. */
export async function updateProfile(userId: number, input: unknown): Promise<PublicUser> {
  const data = parse(profileSchema, input);

  const owner = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (owner && owner.id !== userId) throw new ConflictError(DUPLICATE_EMAIL, "email");

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { name: data.name, email: data.email },
      select: publicUser,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError(DUPLICATE_EMAIL, "email");
    throw error;
  }
}

/**
 * F4: change password. A wrong current password is a 400, not a 401, because
 * the client treats any 401 as an expired session (F4 FR-4).
 */
export async function changePassword(userId: number, input: unknown): Promise<void> {
  const data = parse(passwordChangeSchema, input);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  if (!(await verifyPassword(user.passwordHash, data.currentPassword))) {
    throw new ValidationError({ currentPassword: ["Current password is incorrect."] });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(data.newPassword) },
  });
}
