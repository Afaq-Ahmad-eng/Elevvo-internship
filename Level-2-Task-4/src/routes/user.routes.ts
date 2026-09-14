import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticateToken } from "../middlewares/authenticate-token.middleware";
import { authorizeRole } from "../middlewares/authorize-role.middleware";
import { Role } from "../types/user.types";

const router = Router();

// Every route below requires a valid JWT — enforced once, at the router level,
// rather than repeating authenticateToken on every single route.
router.use(authenticateToken);

// ADMIN only — list every user in the system.
router.get("/", authorizeRole(Role.ADMIN), userController.getAll);

// Any authenticated user can look up a record by id.
// (A stricter version could check req.user.sub === req.params.id OR admin —
// left simple here since Task 4's focus is AuthN/AuthZ fundamentals.)
router.get("/:id", userController.getById);

// ADMIN only — create a user with an explicit role (unlike public /register).
router.post("/", authorizeRole(Role.ADMIN), userController.create);

export default router;
