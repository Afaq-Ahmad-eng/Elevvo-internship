import { Prisma, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { hashPassword } from "../utils/password.util";
import { RegisterInput } from "../types/dto.types";

// Prisma's generated `select` type lets us define, ONCE, exactly which
// columns are safe to return — passwordHash is deliberately excluded here.
// Every query in this service reuses this same select object, so there is
// a single place that guarantees the hash never leaks into a response.
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const userService = {
  findAll() {
    return prisma.user.findMany({ select: safeUserSelect });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  },

  // Internal-only lookup — returns the FULL row including passwordHash.
  // Only auth.service.ts should call this, to verify login credentials.
  findByEmailInternal(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async create(input: RegisterInput & { role: Role }) {
    const passwordHash = await hashPassword(input.password);

    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: safeUserSelect,
    });
  },
};
