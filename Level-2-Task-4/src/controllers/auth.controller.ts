import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { authService, InvalidCredentialsError } from "../services/auth.service";
import { CreateUserInput, LoginInput, Role } from "../types/user.types";

export const authController = {
  /**
   * POST /register — public signup endpoint.
   *
   * SECURITY NOTE: even if a client sends { "role": "ADMIN" } in the body,
   * we deliberately IGNORE it and force Role.USER. Trusting a client-supplied
   * role on a public endpoint would let anyone self-promote to admin —
   * a classic privilege-escalation bug. Admin accounts must be created
   * through a separate, protected, admin-only endpoint (see user.controller.ts).
   */
  async register(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateUserInput;

    if (!body?.name || !body?.email || !body?.password) {
      res.status(400).json({ error: "name, email and password are required" });
      return;
    }

    if (body.password.length < 8) {
      res.status(400).json({ error: "password must be at least 8 characters" });
      return;
    }

    const existing = userService.findByEmailInternal(body.email);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const safeUser = await userService.create({
      name: body.name,
      email: body.email,
      password: body.password,
      role: Role.USER, // hardcoded — client input is never trusted here
    });

    res.status(201).json(safeUser);
  },

  /**
   * POST /login — validates credentials and issues a JWT.
   */
  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginInput;

    if (!body?.email || !body?.password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    try {
      const { token } = await authService.login(body);
      res.status(200).json({ token });
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        res.status(401).json({ error: err.message });
        return;
      }
      // Unexpected error — don't leak internals to the client.
      console.error("Unexpected login error:", err);
      res.status(500).json({ error: "Something went wrong" });
    }
  },
};
