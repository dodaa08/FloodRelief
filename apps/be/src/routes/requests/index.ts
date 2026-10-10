import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import createRouter from "./create.js";
import photosRouter from "./photos.js";
import readRouter from "./read.js";
import verifyRouter from "./verify.js";

const router = Router();

router.use(requireAuth);

// Role guards live inside each router: requesting is for citizens,
// verifying is for approved responders, reading is for either.
router.use("/", readRouter);
router.use("/", createRouter);
router.use("/", photosRouter);
router.use("/", verifyRouter);

export default router;
