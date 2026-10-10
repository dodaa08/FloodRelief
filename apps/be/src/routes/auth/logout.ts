import { Router } from "express";
import { clearAuthCookie } from "../../lib/cookies.js";

const router = Router();

// Deliberately requires no auth: an expired token must still be able to
// clear its own cookie, otherwise the browser keeps retrying with garbage.
router.post("/", (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({ message: "Logged out" });
});

export default router;
