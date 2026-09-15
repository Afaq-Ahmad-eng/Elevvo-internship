import { Role } from "@prisma/client";

// --- Auth / User DTOs ---

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role; // only trusted when set by an already-authenticated ADMIN
}

export interface LoginInput {
  email: string;
  password: string;
}

// --- Product DTOs ---

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId: string;
}

// --- Pagination / filtering (shared across list endpoints) ---

export interface PaginationQuery {
  take?: number;
  skip?: number;
  search?: string; // free-text filter, e.g. product name contains
}

// --- Checkout / Order DTOs ---

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

export interface CheckoutInput {
  items: CheckoutItemInput[];
}
