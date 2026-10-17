import { createToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each route types its own params
type AnyHandler = (request: Request, context: { params: Promise<any> }) => Promise<Response>;

export type CallOptions = {
  body?: unknown;
  token?: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

/** Calls a Next.js route handler directly with a real Request. */
export async function call(handler: AnyHandler, method: string, path: string, options: CallOptions = {}) {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  const request = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await handler(request, { params: Promise.resolve(options.params ?? {}) });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
}

let counter = 0;

/** Creates a user directly in the database and returns it with a real token. */
export async function createUser(overrides: { name?: string; email?: string; password?: string } = {}) {
  counter += 1;
  const password = overrides.password ?? "password123";
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `User ${counter}`,
      email: overrides.email ?? `user${counter}@example.com`,
      passwordHash: await hashPassword(password),
    },
  });
  const { token } = await createToken(user);
  return { user, token, password };
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
