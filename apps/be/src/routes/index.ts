import { Router } from "express";
import authRouter from "./auth/index.js";
import adminRouter from "./admin/index.js";
import requestsRouter from "./requests/index.js";
import districtsRouter from "./districts/index.js";
import floodRouter from "./flood/index.js";
import photosRouter from "./photos/index.js";
import assignmentsRouter from "./assignments/index.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/requests", requestsRouter);
router.use("/districts", districtsRouter);
router.use("/flood", floodRouter);
router.use("/photos", photosRouter);
router.use("/assignments", assignmentsRouter);

export default router;
