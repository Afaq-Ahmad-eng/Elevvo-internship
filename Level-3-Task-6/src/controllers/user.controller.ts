import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { RegisterInput } from "../types/dto.types";
import { Role } from "@prisma/client";
import { AppError } from "../middlewares/error-handler.middleware";

export const userController = {
  // GET /api/users — ADMIN only (enforced at the route level)
  async getAll(req: Request, res: Response): Promise<void> {
    res.status(200).json(await userService.findAll());
  },

  async getById(req: Request, res: Response): Promise<void> {
    const user = await userService.findById(req.params.id);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    res.status(200).json(user);
  },

  // POST /api/users — ADMIN only. Unlike /register, this DOES trust the
  // `role` field, because only a verified admin (checked by route middleware)
  // can reach this handler.
  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as RegisterInput;

    if (!body?.name || !body?.email || !body?.password) {
      throw new AppError(400, "name, email and password are required");
    }

    const newUser = await userService.create({
      ...body,
      role: body.role ?? Role.USER,
    });
    res.status(201).json(newUser);
  },
};
