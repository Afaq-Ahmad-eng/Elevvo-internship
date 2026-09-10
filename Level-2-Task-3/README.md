# Task 3 — Observability & Modular Express API Architecture

A layered Express.js + TypeScript API implementing CRUD for a mock `users`
resource, a global observability (request-logging) middleware, and a bonus
API-key security gate.

## Folder Structure & Naming Convention

```
src/
├── routes/          # <domain>.routes.ts       -> maps URL+method to controller
├── controllers/      # <domain>.controller.ts   -> handles req/res, calls service
├── services/          # <domain>.service.ts      -> business logic, no Express types
├── middlewares/       # <purpose>.middleware.ts  -> cross-cutting concerns
├── types/              # <domain>.types.ts        -> TS interfaces/types
├── app.ts              # Express app setup (middleware + route wiring)
└── server.ts           # Entry point: starts the HTTP server
```

**Naming rule used throughout:** `functional-name.technical-layer.ts`
(kebab-case, lowercase). Example: `user.controller.ts`, `user.service.ts`,
`require-api-key.middleware.ts`. This keeps file purpose obvious at a glance
and is a common convention in real-world Express/Node codebases.

**Repo naming rule:** kebab-case, e.g. `task3-express-ts-api`.

## Why this separation matters (for interviews)

- **Routes** never contain logic — only wiring.
- **Controllers** never touch business rules — only HTTP concerns
  (status codes, request parsing, response shaping).
- **Services** never know about `req`/`res` — pure logic, easily testable
  and reusable if you later add a CLI, a queue worker, or swap Express
  for another framework.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Server runs at `http://localhost:3000`.

## Testing the API

All `/api/users` routes require an `x-api-key` header (see `.env`).

```bash
# Health check (no key required)
curl http://localhost:3000/

# List users (requires key)
curl http://localhost:3000/api/users -H "x-api-key: super-secret-dev-key"

# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "x-api-key: super-secret-dev-key" \
  -d '{"name":"Ali","email":"ali@example.com"}'
```

Every request — successful or not — is logged to the console by the
observability middleware:

```
[2026-08-27T10:15:00.000Z] GET /api/users - 200 - 3.42ms
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled JS (production) |
