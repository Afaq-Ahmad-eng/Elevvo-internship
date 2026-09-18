# Task 4: Stateless JWT Authentication & Threat Mitigation:

An Express.js and TypeScript API demonstrating secure password storage,
stateless JWT authentication, role-based authorization, and common API threat mitigations.

## Features:

- Bcrypt password hashing before users are stored

- JWT login tokens with user id (`sub`) and role claims

- Bearer-token authentication middleware

- `USER` and `ADMIN` role-based access control

- Helmet security headers

- Allow-listed CORS origins

- Login rate limiting: 5 requests per IP per 15 minutes

- Generic login failures to reduce user enumeration

## Folder Structure:

```
src/
├── routes/            # auth.routes.ts, user.routes.ts URL+method -> controller wiring only
├── controllers/        # HTTP layer: parses req, calls services, shapes responses
├── services/            # Business logic: user.service.ts, auth.service.ts
├── middlewares/         # authenticate-token, authorize-role, rate-limit, observability
├── config/               # cors.config.ts CORS allow-list configuration
├── types/                 # user.types.ts, jwt.types.ts, express/index.d.ts (Request augmentation)
├── utils/                  # password.util.ts (bcrypt), jwt.util.ts (sign/verify)
├── app.ts                  # Express app: middleware order + route mounting
└── server.ts                # Entry point
```

## Security Design:

**1. Passwords are never stored or returned in plain text.**
`password.util.ts` hashes with bcrypt (cost factor from `BCRYPT_SALT_ROUNDS`,
default 12) before the user is ever saved. `user.service.ts` always strips
`passwordHash` out of any response via `toSafeUser()`.

**2. Public registration cannot self-promote to ADMIN.**
`POST /register` always creates a `USER`, regardless of any role sent by the client. Only an authenticated `ADMIN` can create a user with an explicit role through `POST /api/users`.

**3. Login errors don't leak whether an email exists.**
Both "email not found" and "wrong password" return the exact same generic
`401 Invalid email or password`. Distinguishing them would let an attacker enumerate which emails have accounts (a real vulnerability class).

**4. JWT payload is minimal.**
Only `sub` (user id) and `role` are embedded JWTs are signed, not encrypted, so anyone holding the token can decode and read the payload. Never put passwords or sensitive PII (Personally Identifiable Information) inside a JWT.

**5. Middleware order matters.**
`authenticateToken` runs at the `/api/users` router level before
`authorizeRole`, which relies on the authenticated JWT payload in `req.user`.

**6. Rate limiting on `/login` specifically (not global).**
5 requests per 15-minute window, scoped to the login route only, to slow down brute-force / credential-stuffing attempts without throttling normal API usage elsewhere.

**7. CORS allow-list.**
Only origins listed in `ALLOWED_ORIGINS` can make browser cross-origin requests. Requests without an `Origin` header, such as curl or server-to-server requests, are allowed because CORS is enforced by browsers.

**8. Helmet sets secure HTTP headers globally**, applied first in the middleware chain, before any route logic runs.

## Setup:

```bash
npm install
copy .env.example .env
npm run dev
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

Before deployment, replace `JWT_SECRET` in `.env` with a long, random secret.
The server loads `.env` through `dotenv`; `.env.example` is only a template.

The default server URL is `http://localhost:3000`. Use `npm run build` to compile the project and `npm start` to run the compiled output.

## API Reference:

| Method | Route | Auth required | Role required | Notes |
|---|---|---|---|---|
| POST | `/register` | No | — | Always creates a `USER`, ignores client-supplied `role` |
| POST | `/login` | No | — | Rate-limited: 5 requests / 15 min |
| GET | `/api/users` | Yes | ADMIN | List all users |
| GET | `/api/users/:id` | Yes | Any authenticated user | Look up one user |
| POST | `/api/users` | Yes | ADMIN | Create a user with an explicit role |

`GET /api/users/:id` requires a valid token but currently does not restrict the
requested id to the token owner. It is intentionally kept simple for this
authentication and authorization exercise.

## Testing with curl:

```bash
# Register
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ali","email":"ali@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@example.com","password":"password123"}'
# -> { "token": "eyJ..." }

# Access a protected route
curl http://localhost:3000/api/users/<id> \
  -H "Authorization: Bearer <token>"
```

## Expected Behavior:

- Registration hashes passwords, never returns `passwordHash`

- `role: "ADMIN"` in a public registration body is ignored

- Correct login issues a valid JWT

- Wrong password returns a generic 401 (no user-enumeration leak)

- No token on a protected route → 401

- Valid token but wrong role on an ADMIN-only route → 403

- 6th login attempt within 15 minutes → 429, with correct
  `RateLimit-Policy: 5;w=900` header

- The project compiles under strict TypeScript (`noImplicitAny` and `strictNullChecks`)

## Current Limitations and Out of Scope:

- User data is stored in an in-memory array and is lost when the server stops.

- There is no admin bootstrap or seed account in this task. Public registration
  creates only `USER` accounts, so an admin must be provisioned separately before testing the admin-only endpoints.

- No automated test suite is included.

- Refresh tokens and token revocation

- Password reset flows

- Distributed rate limiting via Redis (future task)

- PostgreSQL/Prisma persistence (Task 5)