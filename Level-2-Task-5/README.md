# Task 5 — Relational Persistence with PostgreSQL (Supabase) & Prisma ORM

A layered Express.js + TypeScript API where all data now persists in
PostgreSQL (hosted on Supabase) via Prisma ORM, extending the auth system
built in Task 4 with a full E-Commerce domain: Users, Categories, Products,
and Orders (with atomic checkout).

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
fast — so runtime traffic goes through Supabase's connection **pooler**
(pgbouncer). However, `prisma migrate`'s DDL operations (`CREATE TABLE`,
`ALTER TABLE`, etc.) aren't reliably supported through a transaction-mode
pooler, so migrations use a **direct** connection instead. This split is
configured in `schema.prisma`'s `datasource` block via `url` / `directUrl`.

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → Database → Connection String** and copy both
   the **Transaction pooler** (port 6543) and **Direct connection** (port
   5432) strings.
3. `cp .env.example .env` and fill in `DATABASE_URL` / `DIRECT_URL` with
   your real values (and a real `JWT_SECRET`).
4. Install dependencies:
   ```bash
   npm install
   ```
5. Create the database tables from the schema:
   ```bash
   npx prisma migrate dev --name init
   ```
   This both validates `schema.prisma` and applies the migration to your
   Supabase database. It also runs `prisma generate` automatically.
6. (Optional) Seed some sample categories/products:
   ```bash
   npx prisma db seed
   ```
7. Run the server:
   ```bash
   npm run dev
   ```

## ⚠️ What Was and Wasn't Verified in This Build

This project was built in a sandboxed environment whose network access is
restricted to package registries (npm) only — it cannot reach
`binaries.prisma.sh`, which is where Prisma downloads the engine binaries
required for `prisma generate`, `prisma validate`, and `prisma migrate`.
That means:

- ✅ **Verified**: the entire codebase compiles cleanly under strict
  TypeScript (`tsc --noEmit`), checked against a hand-built type stub
  matching this exact schema (temporary, not shipped — see below).
- ✅ **Verified**: all business logic (checkout transaction flow, stock
  validation, pagination math, RBAC gating) was manually traced through
  for correctness.
- ❌ **NOT verified**: an actual `prisma migrate dev` run against a live
  Postgres database. **You must run this yourself** with your real
  Supabase credentials before the API will work — the schema has been
  carefully hand-reviewed for correct Prisma syntax, but only a real
  `prisma migrate`/`validate` run gives a 100% guarantee.
- ❌ **NOT verified**: end-to-end HTTP testing against a running server
  with a real database (Tasks 3 and 4 were verified this way; this one
  could not be, for the reason above).

**Recommended first step after setup**: run through the curl examples
below yourself and confirm each works as described, rather than assuming.

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
4. **`decrement` instead of read-modify-write** — `stock: { decrement: n }`
   is sent as a single atomic SQL statement, avoiding a race condition where
   two simultaneous checkouts both read stale stock and both "succeed"
   incorrectly.
5. **Prisma's generated `Role`/`OrderStatus` enums are reused directly**,
   not redefined as separate TypeScript enums — this guarantees the
   database schema and application types can never silently drift apart.
6. **`safeUserSelect`** — a single, reused Prisma `select` object that
   guarantees `passwordHash` can never accidentally leak into a response,
   no matter which query in `user.service.ts` you're reading.
