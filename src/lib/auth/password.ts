import argon2 from "argon2";

// argon2id password hashing (F2 FR-5). Plain-text passwords are never stored,
// returned, or logged.

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burn the same time as a real verification when the email is unknown, so
 * login response time doesn't reveal which emails have accounts (F3 FR-3).
 */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(await dummyHash, password);
}
