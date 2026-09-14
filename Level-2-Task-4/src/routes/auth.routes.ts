import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { loginRateLimiter } from "../middlewares/rate-limit.middleware";

const router = Router();

// Public — no auth required to sign up.
router.post("/register", authController.register);

// Public, but rate-limited to slow down brute-force attempts.
router.post("/login", loginRateLimiter, authController.login);

export default router;
