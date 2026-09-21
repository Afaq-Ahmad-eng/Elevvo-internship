import { Request, Response } from "express";
import { productService } from "../services/product.service";
import { CreateProductInput } from "../types/dto.types";
import { AppError } from "../middlewares/error-handler.middleware";

export const productController = {
  /**
   * GET /api/products?take=10&skip=0&search=shirt
   * Public browsing the catalog doesn't require authentication.
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const take = req.query.take ? Number(req.query.take) : undefined;
    const skip = req.query.skip ? Number(req.query.skip) : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    if (take !== undefined && (Number.isNaN(take) || take < 0)) {
      throw new AppError(400, "take must be a non-negative number");
    }
    if (skip !== undefined && (Number.isNaN(skip) || skip < 0)) {
      throw new AppError(400, "skip must be a non-negative number");
    }

    const result = await productService.findMany({ take, skip, search });
    res.status(200).json(result);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const product = await productService.findById(req.params.id);
    if (!product) {
      throw new AppError(404, "Product not found");
    }
    res.status(200).json(product);
  },

  // ADMIN only (enforced at the route level)
  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as CreateProductInput;

    if (!body?.name || body.price === undefined || body.stock === undefined || !body.categoryId) {
      throw new AppError(400, "name, price, stock and categoryId are required");
    }
    if (body.price < 0 || body.stock < 0) {
      throw new AppError(400, "price and stock must be non-negative");
    }

    const product = await productService.create(body);
    res.status(201).json(product);
  },
};
