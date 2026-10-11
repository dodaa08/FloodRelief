import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import createRouter from "./create.js";
import photosRouter from "./photos.js";
import publicRouter from "./public.js";
import readRouter from "./read.js";
import verifyRouter from "./verify.js";
import feedRouter from "./feed.js";
import actionsRouter from "./actions.js";

const router = Router();

// Public verified-needs endpoints (live map + briefs) — mounted before auth.
router.use("/", publicRouter);

router.use(requireAuth);

// Role guards live inside each router: requesting is for citizens,
// verifying is for approved responders, reading is for either.
router.use("/", readRouter);
router.use("/", feedRouter);
router.use("/", createRouter);
router.use("/", photosRouter);
router.use("/", actionsRouter);
router.use("/", verifyRouter);

export default router;
