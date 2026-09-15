import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { loginRateLimiter } from "../middlewares/rate-limit.middleware";
import { asyncHandler } from "../utils/async-handler.util";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", loginRateLimiter, asyncHandler(authController.login));

export default router;
