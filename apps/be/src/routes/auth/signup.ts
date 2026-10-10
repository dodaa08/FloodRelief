import { Router } from "express";
import { prisma } from "@repo/db";
import { signupSchema, type SignupInput } from "@repo/common/types";
import { publicUser } from "./public-user.js";
import { signAuthToken } from "./token.js";
import { setAuthCookie } from "../../lib/cookies.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues });
    }
    const data: SignupInput = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await Bun.password.hash(data.password);

    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        name: data.name,
        role: data.role || "CITIZEN",
        approvalStatus: data.role && data.role !== "CITIZEN" ? "PENDING" : "APPROVED",
        passwordHash,
      },
    });

    // Signed in immediately, so the user is never asked to type the
    // password a second time right after creating it.
    const token = signAuthToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
