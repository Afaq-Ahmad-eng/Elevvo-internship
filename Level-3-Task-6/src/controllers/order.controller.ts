import { Request, Response } from "express";
import { orderService } from "../services/order.service";
import { CheckoutInput } from "../types/dto.types";
import { AppError } from "../middlewares/error-handler.middleware";

export const orderController = {
  /**
   * POST /api/orders — requires authentication (see order.routes.ts).
   * req.user is guaranteed populated here because authenticateToken runs first.
   */
  async checkout(req: Request, res: Response): Promise<void> {
    const body = req.body as CheckoutInput;
        
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      throw new AppError(400, "items array is required and cannot be empty");
    }

    // req.user is set by authenticateToken; the `!` is safe here because
    // this route is always mounted behind that middleware (see routes file).
    const userId = req.user!.sub;

    const result = await orderService.checkout(userId, body);
    res.status(201).json(result);
  },

  async getMyOrders(req: Request, res: Response): Promise<void> {
    const userId = req.user!.sub;
    const orders = await orderService.findByUser(userId);
    res.status(200).json(orders);
  },
};
