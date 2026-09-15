import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { authService } from "../services/auth.service";
import { RegisterInput, LoginInput } from "../types/dto.types";
import { Role } from "@prisma/client";
import { AppError } from "../middlewares/error-handler.middleware";

export const authController = {
  /**
   * POST /register — public. Always forces Role.USER regardless of what
   * the client sends, to prevent privilege escalation via signup.
   */
  async register(req: Request, res: Response): Promise<void> {
    const body = req.body as RegisterInput;

    if (!body?.name || !body?.email || !body?.password) {
      throw new AppError(400, "name, email and password are required");
    }
    if (body.password.length < 8) {
      throw new AppError(400, "password must be at least 8 characters");
    }

    const existing = await userService.findByEmailInternal(body.email);
    if (existing) {
      throw new AppError(409, "An account with this email already exists");
    }

    const safeUser = await userService.create({
      ...body,
      role: Role.USER, // hardcoded — never trust client input here
    });

    res.status(201).json(safeUser);
  },

  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginInput;

    if (!body?.email || !body?.password) {
      throw new AppError(400, "email and password are required");
    }

    const { token } = await authService.login(body);
    res.status(200).json({ token });
  },
};
