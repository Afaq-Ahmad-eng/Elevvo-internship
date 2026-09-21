import { prisma } from "../config/prisma";
import { CheckoutInput } from "../types/dto.types";
import { AppError } from "../middlewares/error-handler.middleware";
import { OrderStatus, Prisma } from "@prisma/client";

export const orderService = {
  /**
   * Checkout: deducts inventory AND creates the order in a single atomic
   * operation. This is the core "Relational Integrity (ACID)" requirement.
   *
   * WHY A TRANSACTION IS REQUIRED HERE (not just a nested write):
   * We must first CHECK that enough stock exists before deciding to
   * deduct it that's a read-then-write sequence, not a single insert.
   * If we did these as separate, non-transactional queries, a crash or
   * concurrent request between the stock check and the order creation
   * could leave the database in an inconsistent state (e.g. stock
   * deducted but no order created, or an order created with no stock
   * actually reserved). Wrapping the whole sequence in `$transaction`
   * guarantees either ALL of it succeeds, or NONE of it does if any
   * product has insufficient stock, we throw, and Prisma automatically
   * rolls back every change made so far in this transaction.
   */
  async checkout(userId: string, input: CheckoutInput) {
    if (!input.items || input.items.length === 0) {
      throw new AppError(400, "Order must contain at least one item");
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let total = 0;
      const orderItemsData: {
        productId: string;
        quantity: number;
        unitPrice: number;
      }[] = [];

      // Step 1: validate stock and build up order line items.
      for (const item of input.items) {
        if (item.quantity <= 0) {
          throw new AppError(400, "Item quantity must be greater than zero");
        }

        // `tx.product` note we query through `tx`, the transaction client,
        // not the top-level `prisma` client. This ensures the read happens
        // inside the same transaction/lock scope as the later write.
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new AppError(404, `Product ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new AppError(
            409,
            `Insufficient stock for "${product.name}" (requested ${item.quantity}, available ${product.stock})`
          );
        }

        // Step 2: deduct stock now, inside the transaction. Using
        // `decrement` (an atomic DB-level operation) rather than reading
        // stock into JS, subtracting, and writing it back this avoids a
        // race condition if two checkouts for the same product ran
        // concurrently (Prisma sends `stock = stock - quantity` as raw SQL,
        // rather than a read-modify-write from application memory).
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Snapshot the price NOW if the product's price changes later,
        // this order's historical total must stay accurate.
        const unitPrice = Number(product.price);
        total += unitPrice * item.quantity;

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
        });
      }

      // Step 3: create the order with all its items in ONE nested write
      // Prisma generates a single multi-row INSERT for the related
      // OrderItem rows alongside the Order row itself.
      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.COMPLETED,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      return { order, total };
    });
    // If ANY throw happened above (insufficient stock, bad product id,
    // invalid quantity), Prisma automatically rolls back every `tx.*`
    // operation that already ran in this transaction no partial state.
  },

  findByUser(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
