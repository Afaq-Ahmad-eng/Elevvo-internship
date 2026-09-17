import { randomUUID } from "crypto";
import { User, SafeUser, CreateUserInput, Role } from "../types/user.types";
import { hashPassword } from "../utils/password.util";

const users: User[] = [];

/**
 * Strips the passwordHash off a User before it's ever sent in a response.
 * Every controller MUST pass data through this before responding
 * this is the single choke point that prevents password hashes leaking.
 */
function toSafeUser(user: User): SafeUser {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export const userService = {
  findAll(): SafeUser[] {
    return users.map(toSafeUser);
  },

  findById(id: string): SafeUser | undefined {
    const user = users.find((u) => u.id === id);
    return user ? toSafeUser(user) : undefined;
  },

  // Internal-only lookup returns the FULL user including passwordHash.
  // Only auth.service.ts should call this, to verify login credentials.
  findByEmailInternal(email: string): User | undefined {
      return users.find((u) => u.email === email);
  },

  async create(input: CreateUserInput): Promise<SafeUser> {
    const passwordHash = await hashPassword(input.password);

    const newUser: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role ?? Role.USER, // default every new signup to USER, never ADMIN
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    return toSafeUser(newUser);
  },
};