import { Role } from "./user.types";

// Shape of the data we embed INSIDE the JWT itself (the "claims").
// Keep this minimal — anything in here is technically readable by
// anyone who has the token (JWTs are signed, not encrypted), so
// never put sensitive data like passwords in the payload.
export interface JwtPayload {
  sub: string; // "subject" — standard JWT claim name for the user's id
  role: Role;
}
