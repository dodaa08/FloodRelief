import type { Request, Response } from "express";

export const AUTH_COOKIE_NAME = "access_token";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // matches JWT expiry

// httpOnly: JS on the page can't read the token (XSS).
// sameSite=lax: browser won't attach it to cross-site POSTs (CSRF).
// secure: off in dev because localhost is plain http.
function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { ...authCookieOptions(), maxAge: undefined });
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(pair.slice(eq + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// Bearer header wins so API clients and curl keep working as before;
// browsers use the cookie.
export function getAuthToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token.length > 0) return token;
  }
  return readCookie(req, AUTH_COOKIE_NAME);
}
