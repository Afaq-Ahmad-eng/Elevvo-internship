import { Router } from "express";
import { productController } from "../controllers/product.controller";
import { authenticateToken } from "../middlewares/authenticate-token.middleware";
import { authorizeRole } from "../middlewares/authorize-role.middleware";
import { asyncHandler } from "../utils/async-handler.util";
import { Role } from "@prisma/client";

const router = Router();

// Public browsing no auth required to view the catalog.
router.get("/", asyncHandler(productController.getAll));
router.get("/:id", asyncHandler(productController.getById));

// Creating a product is an ADMIN-only action.
router.post(
  "/",
  authenticateToken,
  authorizeRole(Role.ADMIN),
  asyncHandler(productController.create)
);

export default router;
