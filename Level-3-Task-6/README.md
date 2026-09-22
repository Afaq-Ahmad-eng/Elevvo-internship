# Task 6: Redis-Cached E-Commerce API

Level-3-Task-6 extends the Task 5 E-Commerce API with:

- Redis cache-aside reads for products.
- Active cache invalidation after product creation, update, and deletion.
- Redis-backed login rate limiting shared by all API instances.
- Graceful Redis degradation: database reads continue if Redis is unavailable.

## Project Structure

```text
src/
├── config/       Prisma, Redis, CORS, and cache-key configuration
├── controllers/  HTTP validation and response handling
├── middlewares/  authentication, authorization, errors, and rate limiting
├── routes/       auth, users, products, and orders
├── services/     database, authentication, order, product, and cache logic
└── utils/        JWT, password, and async-handler helpers
prisma/           schema, seed data, and migrations
docker-compose.yml  Local Redis service
```

## Cache-Aside Behavior

```text
GET /api/products/:id
        |
        v
  Check Redis for product:<id>
        |
   +----+----+
  HIT       MISS
   |          |
   |          v
   |    Query PostgreSQL through Prisma
   |          |
   |          v
   |    Store the result in Redis for 1 hour
   |          |
   +----+-----+
        v
  Return the response
```

Both product GET endpoints use `getOrSetCache()` in
`src/services/cache.service.ts`. List results are keyed by their exact
`take`, `skip`, and `search` values, so different query variants do not
collide. Cached values expire after one hour.

## Active Cache Invalidation

`POST /api/products`, `PUT /api/products/:id`, and
`DELETE /api/products/:id` invalidate cached list pages. Update and delete
also invalidate the exact `product:<id>` entry. This prevents stale product
data from being served for the full cache TTL.

Pattern invalidation uses Redis `SCAN` rather than `KEYS`, so the whole Redis
server is not blocked while matching list keys.

## Distributed Login Rate Limiting

The default `express-rate-limit` store keeps counters in one Node process.
That is insufficient when multiple API instances run behind a load balancer.
This project uses `rate-limit-redis` so every instance shares the same counter.

The current limit is five login requests per fifteen minutes per client key.
The sixth request is rejected with `429`.

## Setup

Prerequisites: Node.js, npm, Docker, a PostgreSQL database, and Redis.

1. Install dependencies and create the environment file:

   ```bash
   npm install
   copy .env.example .env
   ```

   On macOS/Linux, use `cp .env.example .env` instead of `copy`.

2. Put valid PostgreSQL values in `.env`. `DATABASE_URL` is used at runtime;
   `DIRECT_URL` is used by Prisma migrations.

3. Start local Redis:

   ```bash
   docker compose up -d
   ```

4. After resolving the Prisma schema issue described below, initialize the
   database and start the API:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   npx prisma db seed
   npm run dev
   ```

The server starts on `http://localhost:3000` by default. `REDIS_URL` defaults
to `redis://localhost:6379`, matching `docker-compose.yml`.

## Known Setup Blocker

The current `prisma/schema.prisma` declares `model Categories`, while its
relation and application code use the Prisma delegate `category` and the
type `Category`. This inconsistency causes `prisma generate` to fail before
the API can run.

Rename the schema model to `Category` while keeping `@@map("categories")`,
or consistently change every application reference to `Categories`. Then
regenerate the Prisma client and run the migration. This README documents the
current codebase; it does not claim that Prisma generation or end-to-end
database requests have succeeded until that blocker is fixed.

## API Reference

All request and response bodies are JSON. Protected routes require:

```http
Authorization: Bearer <jwt>
```

| Method | Route | Auth | Role | Purpose |
|---|---|---|---|---|
| POST | `/register` | No | -- | Create a normal user account |
| POST | `/login` | No | -- | Return a JWT; Redis rate limited |
| GET | `/api/users` | Yes | ADMIN | List users |
| GET | `/api/users/:id` | Yes | Any authenticated user | Get one user |
| POST | `/api/users` | Yes | ADMIN | Create a user |
| GET | `/api/products` | No | -- | List products with pagination/search |
| GET | `/api/products/:id` | No | -- | Get one product |
| POST | `/api/products` | Yes | ADMIN | Create a product |
| PUT | `/api/products/:id` | Yes | ADMIN | Partially update a product |
| DELETE | `/api/products/:id` | Yes | ADMIN | Delete a product |
| POST | `/api/orders` | Yes | Any authenticated user | Checkout products |
| GET | `/api/orders` | Yes | Any authenticated user | List the user's orders |

### Product Examples

Create a product:

```json
{
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse",
  "price": 24.99,
  "stock": 50,
  "categoryId": "<category-id>"
}
```

`PUT /api/products/:id` is a partial update. Send only the fields that should
change; omitted fields remain unchanged:

```json
{
  "price": 29.99,
  "stock": 40
}
```

The product ID must be the database ID, and the request must use an ADMIN JWT.
An empty update body returns `400`.

Product list options are `take`, `skip`, and `search`, for example:
`GET /api/products?take=10&skip=0&search=mouse`.

### Checkout Example

```json
{
  "items": [
    { "productId": "<product-id>", "quantity": 2 }
  ]
}
```

Checkout runs in a Prisma transaction, checks stock, snapshots the product
price in each order item, and decrements stock atomically.

## Verification Status

The Redis cache and rate-limiting design are present in the source. Full API
verification is currently blocked by the Prisma schema naming mismatch above;
the current `prisma generate` command exits with an error until that is fixed
and valid database credentials are available.