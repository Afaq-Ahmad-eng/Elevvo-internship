import { Router } from "express";
import { productController } from "../controllers/product.controller";
import { authenticateToken } from "../middlewares/authenticate-token.middleware";
import { authorizeRole } from "../middlewares/authorize-role.middleware";
import { asyncHandler } from "../utils/async-handler.util";
import { Role } from "@prisma/client";

const router = Router();

// Public browsing — no auth required, and this is exactly the
// high-frequency read path the Cache-Aside pattern targets.
router.get("/", asyncHandler(productController.getAll));
router.get("/:id", asyncHandler(productController.getById));

// Mutating routes are ADMIN only, and each one actively invalidates the
// Redis cache inside its service method (see product.service.ts).
router.post(
  "/",
  authenticateToken,
  authorizeRole(Role.ADMIN),
  asyncHandler(productController.create)
);
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(Role.ADMIN),
  asyncHandler(productController.update)
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(Role.ADMIN),
  asyncHandler(productController.remove)
);

export default router;
