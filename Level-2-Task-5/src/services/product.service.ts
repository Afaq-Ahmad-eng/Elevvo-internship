import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { CreateProductInput, PaginationQuery } from "../types/dto.types";
import { AppError } from "../middlewares/error-handler.middleware";

// Sensible caps so a client can't request an absurdly large page and
// accidentally (or deliberately) load the entire table into memory.
const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;

export const productService = {
  /**
   * Paginated + filterable product listing.
   * - `take`/`skip` implement offset pagination via Prisma's query builder.
   * - `search` implements relational filtering with a case-insensitive
   *   partial match on the product name.
   */
  async findMany(query: PaginationQuery) {
    const take = Math.min(query.take ?? DEFAULT_TAKE, MAX_TAKE);
    const skip = query.skip ?? 0;

    const where: Prisma.ProductWhereInput = query.search
      ? {
          name: {
            contains: query.search,
            mode: "insensitive", // case-insensitive search
          },
        }
      : {};

    // Run the paginated query and the total count together needed so
    // the client can calculate total pages, not just what's on this page.
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: { category: true },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, take, skip };
  },

  findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
  },

  async create(input: CreateProductInput) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new AppError(400, "categoryId does not reference an existing category");
    }

    return prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        stock: input.stock,
        categoryId: input.categoryId,
      },
    });
  },
};
