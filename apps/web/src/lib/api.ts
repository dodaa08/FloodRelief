export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Origin without the /api/v1 suffix — used for absolute photo upload URLs
// the backend returns as paths.
export const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, "");

export function absoluteApiUrl(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${API_ORIGIN}${pathOrUrl}`;
}

export const AUTH_TOKEN_KEY = "pukaar_token";

// Broadcast whenever the stored session changes so useUser() instances (e.g.
// the header menu) pick up sign-in/sign-out without a full page reload.
export const AUTH_EVENT = "pukaar:auth-changed";

function dispatchAuthEvent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  dispatchAuthEvent();
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  dispatchAuthEvent();
}

// Thin wrapper around the backend. Sends the stored token as a Bearer header
// (the backend also accepts the httpOnly cookie for browser flows).
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      typeof body?.error === "string"
        ? body.error
        : Array.isArray(body?.error)
          ? body.error.map((e: { message?: string }) => e?.message ?? "Invalid input").join(" · ")
          : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}