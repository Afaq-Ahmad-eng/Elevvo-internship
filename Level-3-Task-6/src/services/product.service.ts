import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { CreateProductInput, UpdateProductInput, PaginationQuery } from "../types/dto.types";
import { AppError } from "../middlewares/error-handler.middleware";
import { getOrSetCache, invalidateCacheKey, invalidateCachePattern } from "./cache.service";
import { cacheKeys } from "../config/cache-keys.config";

const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;

export const productService = {
  /**
   * Paginated + filterable product listing — CACHE-ASIDE applied here.
   * Cache key includes take/skip/search so every distinct query variant
   * gets its own cache entry (see cacheKeys.productList).
   */
  async findMany(query: PaginationQuery) {
    const take = Math.min(query.take ?? DEFAULT_TAKE, MAX_TAKE);
    const skip = query.skip ?? 0;
    const key = cacheKeys.productList(take, skip, query.search);

    return getOrSetCache(key, async () => {
      const where: Prisma.ProductWhereInput = query.search
        ? { name: { contains: query.search, mode: "insensitive" } }
        : {};

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
    });
  },

  /**
   * Single product lookup — CACHE-ASIDE applied here too.
   * This is the endpoint most directly affected by the invalidation logic
   * in update()/remove() below, since its key is keyed by exact product id.
   */
  async findById(id: string) {
    const key = cacheKeys.productById(id);
    return getOrSetCache(key, () =>
      prisma.product.findUnique({
        where: { id },
        include: { category: true },
      })
    );
  },

  async create(input: CreateProductInput) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
        
    if (!category) {
      throw new AppError(400, "categoryId does not reference an existing category");
    }

    const product = await prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        stock: input.stock,
        categoryId: input.categoryId,
      },
    });

    // A newly created product can change what appears on any cached list
    // page (e.g. it might now match a search filter, or appear on page 1
    // if sorted by newest-first) — so all cached list pages are invalidated.
    // The individual product:{id} key doesn't need invalidation since it
    // didn't exist in the cache before this point.
    await invalidateCachePattern(cacheKeys.productListPattern);

    return product;
  },

  /**
   * PUT /api/products/:id — updates a product AND actively invalidates
   * its cache entry (the bonus requirement). We purge rather than try to
   * update the cached value in place, because "purge on write, repopulate
   * on next read" is simpler and less error-prone than keeping a cached
   * object in sync with every possible field change.
   */
  async update(id: string, input: UpdateProductInput) {
    console.log("Check the id in the product service ", id);
    
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Product not found");
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        throw new AppError(400, "categoryId does not reference an existing category");
      }
    }

    const data: Prisma.ProductUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.price !== undefined) data.price = input.price;
    if (input.stock !== undefined) data.stock = input.stock;
    if (input.categoryId !== undefined) {
      data.category = { connect: { id: input.categoryId } };
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    // Actively purge BOTH the specific product's cache entry AND every
    // cached list page a price/name/stock change could affect how this
    // product appears (or whether it appears at all) in any list view.
    await Promise.all([
      invalidateCacheKey(cacheKeys.productById(id)),
      invalidateCachePattern(cacheKeys.productListPattern),
    ]);

    return updated;
  },

  /**
   * DELETE /api/products/:id — same active-invalidation principle as
   * update(). Without this, a deleted product would keep being served
   * from cache for up to an hour (the TTL) after it no longer exists in
   * the database — a classic stale-cache bug.
   */
  async remove(id: string): Promise<void> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Product not found");
    }

    await prisma.product.delete({ where: { id } });

    await Promise.all([
      invalidateCacheKey(cacheKeys.productById(id)),
      invalidateCachePattern(cacheKeys.productListPattern),
    ]);
  },
};
