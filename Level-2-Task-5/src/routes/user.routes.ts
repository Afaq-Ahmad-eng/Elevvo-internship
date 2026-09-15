import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticateToken } from "../middlewares/authenticate-token.middleware";
import { authorizeRole } from "../middlewares/authorize-role.middleware";
import { asyncHandler } from "../utils/async-handler.util";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticateToken); // every route below requires a valid JWT

router.get("/", authorizeRole(Role.ADMIN), asyncHandler(userController.getAll));
router.get("/:id", asyncHandler(userController.getById));
router.post("/", authorizeRole(Role.ADMIN), asyncHandler(userController.create));

export default router;
