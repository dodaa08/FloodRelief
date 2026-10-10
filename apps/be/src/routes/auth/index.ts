import { Router } from "express";
import signupRouter from "./signup.js";
import signinRouter from "./signin.js";
import meRouter from "./me.js";
import otpRouter from "./otp.js";
import logoutRouter from "./logout.js";

const router = Router();

router.use("/signup", signupRouter);
router.use("/signin", signinRouter);
router.use("/me", meRouter);
router.use("/otp", otpRouter);
router.use("/logout", logoutRouter);

export default router;
