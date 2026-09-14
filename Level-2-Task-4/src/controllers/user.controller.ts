import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { CreateUserInput } from "../types/user.types";

export const userController = {
  // GET /api/users — ADMIN only (enforced by route-level middleware, not here)
  getAll(req: Request, res: Response): void {
    res.status(200).json(userService.findAll());
  },

  // GET /api/users/:id — ADMIN, or the user viewing their own record
  getById(req: Request, res: Response): void {
    const user = userService.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(user);
  },

  /**
   * POST /api/users — ADMIN only.
   * Unlike public /register, this endpoint DOES trust the `role` field,
   * because it's protected by authenticateToken + authorizeRole(ADMIN)
   * at the route level — only a verified admin can reach this handler.
   */
  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateUserInput;

    if (!body?.name || !body?.email || !body?.password) {
      res.status(400).json({ error: "name, email and password are required" });
      return;
    }

    const newUser = await userService.create(body);
    res.status(201).json(newUser);
  },
};
