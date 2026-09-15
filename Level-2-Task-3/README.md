# Level 2 Task 3: Observability and Modular Express API:

This project is a TypeScript-based Express API built to demonstrate clean layered architecture, reusable service logic, request observability, and API-key protection.

The application exposes a mock `users` resource with basic CRUD operations and logs every incoming request in a consistent, production-style format.

## Overview:

The main goals of this task are to:

- implement a modular Express.js API structure

- separate routes, controllers, services, and types cleanly

- add request-level observability middleware

- secure protected routes with an API key check

- keep business logic independent from HTTP concerns

## Features:

- CRUD endpoints for a mock user resource

- Global request logging with timestamp, method, path, status, and duration

- API-key validation for `/api/users` routes

- Clean TypeScript interfaces and typed request payloads

- Layered architecture for maintainability and interview-readiness

## Project Structure:

```bash
src/
├── app.ts                  # Express app configuration and route registration
├── server.ts               # Application entry point
├── controllers/
│   └── user.controller.ts  # HTTP request/response handling
├── middlewares/
│   ├── observability.middleware.ts
│   └── require-api-key.middleware.ts
├── routes/
│   └── user.routes.ts      # Route-to-controller mapping
├── services/
│   └── user.service.ts     # Business logic for user operations
├── types/
│   └── user.types.ts       # User model and request payload types
```

## Architecture Pattern:

Each layer has a specific responsibility:

- `routes/`: defines URL paths and HTTP methods

- `controllers/`: handles request parsing and response formatting

- `services/`: contains business logic and in-memory data operations

- `middlewares/`: applies cross-cutting concerns such as logging and auth

- `types/`: centralizes shared TypeScript interfaces and input types

This follows a common enterprise pattern where the application remains easier to test, extend, and maintain.

## Naming Convention:

Files follow the pattern:

```bash
<feature>.<layer>.ts
```

Examples:

- `user.controller.ts`

- `user.service.ts`

- `require-api-key.middleware.ts`

This improves readability and keeps file purpose obvious at a glance.

## Environment Configuration:

The project uses environment variables for the app port and the required API key.

Update the values in `.env.example` before starting the server:

```env
PORT=3000
API_KEY=secret-dev-key
```

The server is configured to load this file using `dotenv`, so the application reads the same values at runtime.

## Installation:

```bash
npm install
```

## Running the Project:

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

The app runs on:

```bash
http://localhost:3000
```

# API Endpoints:

### Health Check

```bash
GET /
```

Response:

```json
{
  "status": "ok",
  "message": "API is running"
}
```

### User Routes:

All routes under `/api/users` require the `x-api-key` header.

#### Get all users:

```bash
GET /api/users
Header: x-api-key: super-secret-dev-key
```

#### Get a user by ID:

```bash
GET /api/users/:id
Header: x-api-key: super-secret-dev-key
```

#### Create a user:

```bash
POST /api/users
Header: x-api-key: super-secret-dev-key
Content-Type: application/json
```

Request body:

```json
{
  "name": "Ali",
  "email": "ali@example.com"
}
```

#### Update a user:

```bash
PUT /api/users/:id
Header: x-api-key: super-secret-dev-key
Content-Type: application/json
```

Example body:

```json
{
  "name": "Ali Hassan",
  "email": "ali.hassan@example.com"
}
```

#### Delete a user:

```bash
DELETE /api/users/:id
Header: x-api-key: super-secret-dev-key
```

## Example Requests:

### Health Check:

```bash
curl http://localhost:3000/
```

### List Users:

```bash
curl http://localhost:3000/api/users \
  -H "x-api-key: super-secret-dev-key"
```

### Create User:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "x-api-key: super-secret-dev-key" \
  -d '{"name":"Ali","email":"ali@example.com"}'
```

### Delete User:

```bash
curl -X DELETE http://localhost:3000/api/users/<user-id> \
  -H "x-api-key: super-secret-dev-key"
```

## Middleware Behavior:

### Observability Middleware:

Every request is logged to the console after completion. The log includes:

- timestamp

- HTTP method

- original URL

- response status code

- response time in milliseconds

Example output:

```bash
[2026-08-27T10:15:00.000Z] GET /api/users - 200 - 3.42ms
```

This makes it easy to trace requests, diagnose failures, and monitor application activity.

### API-Key Middleware:

The route group `/api/users` is protected by `requireAPIKey`, which checks for a valid `x-api-key` header.

If the header is missing or invalid, the API returns:

```json
{
  "error": "Unauthorized: invalid or missing API key"
}
```

with an HTTP status of `401`.

## Error Handling:

The API returns standard HTTP error responses for invalid input or missing records.

Examples:

- `400 Bad Request` when `name` or `email` is missing during user creation

- `401 Unauthorized` for an invalid or missing API key

- `404 Not Found` when a user ID does not exist

## Scripts:

| Command | Description |
|---|---|
| `npm run dev` | Starts the app in development mode with ts-node-dev |
| `npm run type-check` | Runs TypeScript type checking without emitting files |
| `npm run build` | Compiles the TypeScript project to the `dist` folder |
| `npm start` | Runs the compiled JavaScript build |

## Notes:

This project stores users in memory using an array, so data is not persisted across server restarts. It is intended as a demonstration of API structure and middleware patterns rather than a production database-backed application.

## Summary:

This task demonstrates a clean, interview-friendly Express API design with modular separation of concerns, observability, and security. It is a solid foundation for scaling into more advanced backend applications using databases, validation libraries, authentication, and testing tools.