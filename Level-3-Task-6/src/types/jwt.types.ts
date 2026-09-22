// Note: we import Role from "@prisma/client" rather than redefining it as a
// plain TS enum. Prisma auto-generates a matching TypeScript enum from the
// `enum Role { ... }` block in schema.prisma — reusing it means the database
// schema and the application types can NEVER drift out of sync with each other.
import { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string; // user id
  role: Role;
}
