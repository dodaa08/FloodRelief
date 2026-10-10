import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { publicUser } from "./public-user.js";

const router = Router();

// Lets a client restore its session on cold start: send the stored token,
// get the account back. Cheap way to validate a saved session.
router.get("/", requireAuth, (req, res) => {
  return res.status(200).json({ user: publicUser(req.user!) });
});

export default router;
