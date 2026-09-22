/**
 * Centralized cache key builders. Keeping key naming in ONE place avoids a
 * common real-world bug class: a typo like "product:list" in one file vs
 * "products:list" in another silently breaks cache invalidation, because
 * the two "different" keys never match each other.
 */
export const cacheKeys = {
  productById: (id: string): string => `product:${id}`,

  // Includes every parameter that affects the result set, so two different
  // paginated/filtered views never collide under the same key.
  productList: (take: number, skip: number, search?: string): string =>
    `products:list:take=${take}:skip=${skip}:search=${search ?? ""}`,

  // Wildcard pattern used with SCAN to invalidate ALL cached list pages at
  // once, regardless of their take/skip/search combination.
  productListPattern: "products:list:*",
};
