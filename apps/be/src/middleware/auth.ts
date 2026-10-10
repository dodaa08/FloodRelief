import { verify } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { prisma, type User } from "@repo/db";
import { getAuthToken } from "../lib/cookies.js";

declare global {
  namespace Express {
    interface Request {
      // Populated by requireAuth. Full DB row, so handlers never need a second lookup.
      user?: User;
    }
  }
}

type TokenPayload = {
  sub?: string;
  role?: string;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not set");
      return res.status(500).json({ error: "Internal server error" });
    }

    let payload: TokenPayload;
    try {
      payload = verify(token, secret) as TokenPayload;
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (!payload.sub) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Re-read the user instead of trusting the token alone: a token issued
    // before an account was blocked or deleted must stop working.
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: "Account is blocked" });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export function requireRole(...roles: User["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have access to this resource" });
    }
    return next();
  };
}
