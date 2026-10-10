import { Router } from "express";
import { prisma } from "@repo/db";
import { signinSchema } from "@repo/common/types";
import { publicUser } from "./public-user.js";
import { signAuthToken } from "./token.js";
import { setAuthCookie } from "../../lib/cookies.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = signinSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues });
    }
    const { phone, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    // One generic error for every failure mode, so the response never
    // reveals whether a phone number is registered.
    const invalid = () => res.status(401).json({ error: "Invalid phone or password" });

    if (!user || !user.passwordHash) {
      return invalid();
    }

    const passwordMatches = await Bun.password.verify(password, user.passwordHash);
    if (!passwordMatches) {
      return invalid();
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
