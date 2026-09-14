import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { CreateUserInput, UpdateUserInput } from "../types/user.types";

export const userController = {
  getAll(req: Request, res: Response): void {
    const users = userService.findAll();
    res.status(200).json(users);
  },

  getById(req: Request, res: Response): void {
    const user = userService.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(user);
  },

  create(req: Request, res: Response): void {
    const body = req.body as CreateUserInput;

    if (!body?.name || !body?.email) {
      res.status(400).json({ error: "name and email are required" });
      return;
    }

    const newUser = userService.create(body);
    res.status(201).json(newUser);
  },

  update(req: Request, res: Response): void {
    const body = req.body as UpdateUserInput;
    const updated = userService.update(req.params.id, body);

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(updated);
  },

  remove(req: Request, res: Response): void {
    const deleted = userService.remove(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json({"message": "User deleted successfully!"});
  },
};
