// Roles supported by the RBAC (Role-Based Access Control) system.
// Using an enum (not raw strings) means TypeScript will catch typos like "Admin" vs "ADMIN"
// at compile time, instead of failing silently at runtime.
export enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
}

// The FULL user record as stored internally includes the password hash.
// This type should NEVER be sent directly in an HTTP response.
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // never store or transmit the plain password
  role: Role;
  createdAt: string; // ISO timestamp
}

// The SAFE, public-facing shape of a user passwordHash is stripped out.
// Controllers must always convert User -> SafeUser before sending a response.
export type SafeUser = Omit<User, "passwordHash">;

// Payload accepted when registering a new user (POST /api/users).
export interface CreateUserInput {
  name: string;
  email: string;
  password: string; // plain text, only ever used transiently to hash it
  role?: Role; // optional defaults to USER if omitted
}

// Payload accepted when logging in (POST /login).
export interface LoginInput {
  email: string;
  password: string;
}
