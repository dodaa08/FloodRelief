import { randomInt } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "@repo/db";
import { phoneSchema } from "@repo/common/types";
import { sendOtp } from "../../services/sms.js";
import { publicUser } from "./public-user.js";
import { signAuthToken } from "./token.js";
import { setAuthCookie } from "../../lib/cookies.js";

const router = Router();

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_PHONE = 3; // within REQUEST_WINDOW_MS
const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

// Coarse per-IP brake. The per-phone throttle below is the real protection,
// since one attacker could otherwise rotate IPs and burn SMS credits.
const requestIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: "Too many requests. Try again later." }),
});

const requestSchema = z.object({ phone: phoneSchema });
const verifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

// POST /auth/otp/request  { phone }
// Always answers the same way, whether or not the phone has an account —
// otherwise the endpoint becomes a phone-number existence oracle.
router.post("/request", requestIpLimiter, async (req, res) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const { phone } = parsed.data;

    const recentRequests = await prisma.otpCode.count({
      where: { phone, createdAt: { gt: new Date(Date.now() - REQUEST_WINDOW_MS) } },
    });
    if (recentRequests >= MAX_REQUESTS_PER_PHONE) {
      return res.status(429).json({ error: "Too many codes requested. Try again in a few minutes." });
    }

    const code = randomInt(100000, 999999).toString();
    const codeHash = await Bun.password.hash(code);

    await prisma.otpCode.create({
      data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    await sendOtp(phone, code);

    return res.status(202).json({ message: "Code sent" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/otp/verify  { phone, code }
// Signing in and signing up are the same call: a verified phone with no
// existing account gets one created (passwordless, CITIZEN).
router.post("/verify", async (req, res) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const { phone, code } = parsed.data;

    const otp = await prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) {
      return res.status(400).json({ error: "Code expired or not requested" });
    }

    if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
      return res.status(429).json({ error: "Too many attempts. Request a new code." });
    }

    const matches = await Bun.password.verify(code, otp.codeHash);
    if (!matches) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(401).json({ error: "Invalid code" });
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({ data: { phone } });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: "Account is blocked" });
    }

    const token = signAuthToken(user);
    setAuthCookie(res, token);
    return res.status(200).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
