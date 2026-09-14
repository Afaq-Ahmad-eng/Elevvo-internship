# Task 4 — Stateless JWT Authentication & Threat Mitigation

A layered Express.js + TypeScript API implementing password hashing (bcrypt),
JWT-based authentication, Role-Based Access Control (RBAC), and threat
mitigation (Helmet security headers, strict CORS, and login rate limiting).

## Folder Structure

```
src/
├── routes/            # auth.routes.ts, user.routes.ts — URL+method -> controller wiring only
├── controllers/        # HTTP layer: parses req, calls services, shapes responses
├── services/            # Business logic: user.service.ts, auth.service.ts
├── middlewares/         # authenticate-token, authorize-role, rate-limit, observability
├── config/               # cors.config.ts — CORS allow-list configuration
├── types/                 # user.types.ts, jwt.types.ts, express/index.d.ts (Request augmentation)
├── utils/                  # password.util.ts (bcrypt), jwt.util.ts (sign/verify)
├── app.ts                  # Express app: middleware order + route mounting
└── server.ts                # Entry point
```

## Security Design Decisions (worth understanding, not just copying)

**1. Passwords are never stored or returned in plain text.**
`password.util.ts` hashes with bcrypt (cost factor from `BCRYPT_SALT_ROUNDS`,
default 12) before the user is ever saved. `user.service.ts` always strips
`passwordHash` out of any response via `toSafeUser()`.

**2. Public registration cannot self-promote to ADMIN.**
`POST /register` hardcodes `role: Role.USER` regardless of what the client
sends in the body — even if someone sends `{"role":"ADMIN"}`. Only an
already-authenticated ADMIN can create a user with an elevated role, via
the protected `POST /api/users` endpoint. This closes a common
privilege-escalation vulnerability.

**3. Login errors don't leak whether an email exists.**
Both "email not found" and "wrong password" return the exact same generic
`401 Invalid email or password`. Distinguishing them would let an attacker
enumerate which emails have accounts (a real vulnerability class).

**4. JWT payload is minimal.**
Only `sub` (user id) and `role` are embedded — JWTs are signed, not
encrypted, so anyone holding the token can decode and read the payload.
Never put passwords or sensitive PII inside a JWT.

**5. Middleware order matters and is enforced by comments.**
`authenticateToken` must run before `authorizeRole` — the latter assumes
`req.user` is already populated. Getting this order wrong would make
`authorizeRole` fail open or throw.

**6. Rate limiting on `/login` specifically (not global).**
5 requests per 15-minute window, scoped to the login route only, to slow
down brute-force / credential-stuffing attempts without throttling normal
API usage elsewhere.

**7. Strict CORS allow-list.**
Only origins listed in `ALLOWED_ORIGINS` (comma-separated in `.env`) can
make cross-origin requests. Non-browser tools (curl, Postman, server-to-server
calls) are unaffected — CORS is a browser-enforced mechanism only.

**8. Helmet sets secure HTTP headers globally**, applied first in the
middleware chain, before any route logic runs.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

⚠️ Before deploying anywhere real, replace `JWT_SECRET` in `.env` with a
long, random value — never use the placeholder from `.env.example`.

## API Reference

| Method | Route | Auth required | Role required | Notes |
|---|---|---|---|---|
| POST | `/register` | No | — | Always creates a `USER`, ignores client-supplied `role` |
| POST | `/login` | No | — | Rate-limited: 5 requests / 15 min |
| GET | `/api/users` | Yes | ADMIN | List all users |
| GET | `/api/users/:id` | Yes | Any authenticated user | Look up one user |
| POST | `/api/users` | Yes | ADMIN | Create a user with an explicit role |

## Testing with curl

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

## Verified Behavior (manually tested end-to-end)

- ✅ Registration hashes passwords, never returns `passwordHash`
- ✅ `role: "ADMIN"` in a public registration body is ignored
- ✅ Correct login issues a valid JWT
- ✅ Wrong password returns a generic 401 (no user-enumeration leak)
- ✅ No token on a protected route → 401
- ✅ Valid token but wrong role on an ADMIN-only route → 403
- ✅ 6th login attempt within 15 minutes → 429, with correct
  `RateLimit-Policy: 5;w=900` header
- ✅ Compiles cleanly under strict TypeScript (`noImplicitAny`,
  `strictNullChecks`)

## What's intentionally out of scope (future tasks)

- Real database persistence (Task 5 — PostgreSQL + Prisma)
- Refresh tokens / token revocation
- Password reset flows
- Caching / distributed rate limiting via Redis (Task 6)
