# Task 5 — E-Commerce API with PostgreSQL and Prisma

## What This Project Does

This project is the backend for a small online shop. It lets customers create
accounts, log in, browse products, place orders, and view their order history.
Administrators can create products and manage users.

The important change in Task 5 is persistence: data is no longer stored in
temporary in-memory arrays. Users, categories, products, orders, and order
items are stored permanently in PostgreSQL. Prisma ORM provides the typed link
between the TypeScript application and the database.

## How a Customer Places an Order

1. The customer logs in and receives an access token.
2. The customer selects a product and quantity.
3. The API checks that the product exists and has enough stock.
4. The API reduces stock and creates the order in one database transaction.
5. The order keeps the product price from the time of purchase.

If checkout fails, the transaction rolls back, so the stock and order data are
not left half-updated.

## Folder Structure

```
prisma/
├── schema.prisma        # Data model + relationships (see below)
└── seed.ts               # Optional: seeds sample categories/products
src/
├── routes/               # URL+method -> controller wiring only
├── controllers/           # HTTP layer: parse req, call services, shape response
├── services/               # Business logic + all Prisma queries live here
├── middlewares/            # auth, RBAC, rate-limit, observability, error handling
├── config/                  # prisma.ts (singleton client), cors.config.ts
├── types/                    # DTOs (request shapes) + Express Request augmentation
├── utils/                     # password hashing, JWT, async error wrapper
├── app.ts                     # Express app + middleware wiring
└── server.ts                   # Entry point + graceful shutdown
```

## Domain Model & Relationships

```
User 1---N Order N---N Product   (Order<->Product via OrderItem join model)
Category 1---N Product
```

- **User → Order**: One-to-Many. A user can place many orders.
- **Category → Product**: One-to-Many. A category groups many products.
- **Order ↔ Product**: Many-to-Many, implemented via an **explicit join
  model** (`OrderItem`), not Prisma's implicit `@relation` shorthand —
  because the relationship itself carries data: `quantity`, and a
  **price snapshot** (`unitPrice`) taken at the moment of purchase. If we
  only stored a reference to `Product.price`, a later price change would
  silently rewrite the history of past orders — a real, common bug in
  naive e-commerce schemas.

## Why Supabase Needs TWO Connection Strings

```
DATABASE_URL   -> port 6543, pgbouncer pooler   -> used by the app at runtime
DIRECT_URL     -> port 5432, direct connection  -> used only by `prisma migrate`
```

Supabase (like most managed Postgres) limits direct connections. A backend
opens many short-lived connections per request, which exhausts that limit
fast so runtime traffic goes through Supabase's connection **pooler**
(pgbouncer). However, `prisma migrate`'s DDL operations (`CREATE TABLE`,
`ALTER TABLE`, etc.) aren't reliably supported through a transaction-mode
pooler, so migrations use a **direct** connection instead. This split is
configured in `schema.prisma`'s `datasource` block via `url` / `directUrl`.

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → Database → Connection String** and copy both
   the **Transaction pooler** (port 6543) and **Direct connection** (port
   5432) strings.
3. Copy `.env.example` to `.env` and fill in `DATABASE_URL` / `DIRECT_URL`
   with your real values and set a strong `JWT_SECRET`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Generate the Prisma Client and apply the database migration:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
6. (Optional) Seed some sample categories/products:
   ```bash
   npx prisma db seed
   ```
7. Run the server:
   ```bash
   npm run dev
   ```

## Project Status

The project has a valid Prisma schema, a committed initial SQL migration, and
strict TypeScript compilation. The migration still needs to be applied to the
PostgreSQL database configured in your local `.env` file before the API can
read or write real data.

After setup, confirm the database state with:

```bash
npx prisma validate
npx prisma migrate status
npm run build
```

## API Reference

| Method | Route | Auth | Role | Notes |
|---|---|---|---|---|
| POST | `/register` | No | — | Always creates `USER` role |
| POST | `/login` | No | — | Rate-limited: 5 req / 15 min |
| GET | `/api/products` | No | — | `?take=&skip=&search=` |
| GET | `/api/products/:id` | No | — | |
| POST | `/api/products` | Yes | ADMIN | |
| GET | `/api/users` | Yes | ADMIN | |
| GET | `/api/users/:id` | Yes | Any | |
| POST | `/api/users` | Yes | ADMIN | Trusts client-supplied `role` |
| POST | `/api/orders` | Yes | Any | Checkout — see below |
| GET | `/api/orders` | Yes | Any | Current user's own orders |

## Testing with curl

```bash
# Register + login (see Task 4 README for the full flow)
TOKEN="<paste JWT here>"

# Browse products with pagination + search
curl "http://localhost:3000/api/products?take=5&skip=0&search=keyboard"

# Checkout — atomic: succeeds fully, or fails fully (rolls back)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      { "productId": "<product-id>", "quantity": 2 }
    ]
  }'
```

If you request more `quantity` than a product has in `stock`, the entire
checkout fails with `409 Conflict` and **no** stock is deducted and **no**
order row is created — that's the `$transaction` rollback guarantee in
action.

## Key Design Decisions Worth Being Able to Explain

1. **Explicit join model over implicit many-to-many** — needed because the
   relationship carries data (`quantity`, `unitPrice`).
2. **Price snapshotting** — `unitPrice` is copied onto `OrderItem` at
   checkout time, so historical orders remain accurate even if
   `Product.price` changes later.
3. **`$transaction` for checkout** — a read-then-write sequence (check
   stock, then deduct it, then create the order) is not safe as separate
   queries; a crash or concurrent request between steps could leave stock
   deducted with no order, or vice versa.
4. **Atomic stock update** — `stock: { decrement: n }` is sent as a single
   database update instead of calculating a new stock value in application
   memory. For high-concurrency production use, the stock check should also be
   part of the update condition so two simultaneous checkouts cannot oversell.
5. **Prisma's generated `Role`/`OrderStatus` enums are reused directly**,
   not redefined as separate TypeScript enums — this guarantees the
   database schema and application types can never silently drift apart.
6. **`safeUserSelect`** — a single, reused Prisma `select` object that
   guarantees `passwordHash` can never accidentally leak into a response,
   no matter which query in `user.service.ts` you're reading.
