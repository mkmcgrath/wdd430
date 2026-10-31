import { app, API_BASE } from "../server/app";
import { loginLimiter, registerLimiter } from "../server/auth";

let counter = 0;

export function resetLimits() {
  loginLimiter.reset();
  registerLimiter.reset();
}

export type Client = {
  cookie?: string;
  request: (method: string, path: string, body?: unknown, headers?: Record<string, string>) => Promise<Response>;
  get: (path: string) => Promise<Response>;
  post: (path: string, body?: unknown) => Promise<Response>;
  put: (path: string, body?: unknown) => Promise<Response>;
  del: (path: string) => Promise<Response>;
};

export function client(cookie?: string): Client {
  const self: Client = {
    cookie,
    request: async (method, path, body, headers = {}) =>
      app.request(`${API_BASE}${path}`, {
        method,
        headers: {
          ...(body !== undefined && { "content-type": "application/json" }),
          ...(self.cookie && { cookie: self.cookie }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    get: (path) => self.request("GET", path),
    post: (path, body) => self.request("POST", path, body),
    put: (path, body) => self.request("PUT", path, body),
    del: (path) => self.request("DELETE", path),
  };
  return self;
}

export function cookieFrom(response: Response): string {
  return (response.headers.get("set-cookie") ?? "").split(";")[0];
}

export function uniqueEmail(): string {
  counter += 1;
  return `user${counter}-${Date.now()}@example.com`;
}

export const PASSWORD = "correct horse";

/** Registers a new user and returns a signed-in client. */
export async function signedIn(name = "Test User") {
  resetLimits();
  const email = uniqueEmail();
  const anonymous = client();
  const registered = await anonymous.post("/auth/register", { name, email, password: PASSWORD });
  const user = (await registered.json()) as { id: number };
  const login = await anonymous.post("/auth/login", { email, password: PASSWORD });
  return { api: client(cookieFrom(login)), email, userId: user.id };
}

export async function json<T = any>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
