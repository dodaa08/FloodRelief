import { sign } from "jsonwebtoken";
import type { User } from "@repo/db";

const JWT_EXPIRES_IN = "7d";

export function signAuthToken(user: User): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return sign({ sub: user.id, role: user.role }, secret, { expiresIn: JWT_EXPIRES_IN });
}
