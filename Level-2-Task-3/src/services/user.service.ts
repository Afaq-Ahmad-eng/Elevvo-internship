import { randomUUID } from "crypto";
import { User, CreateUserInput, UpdateUserInput } from "../types/user.types";

const users: User[] = [];

export const userService = {
  findAll(): User[] {
    return users;
  },

  findById(id: string): User | undefined {
    return users.find((u) => u.id === id);
  },

  create(input: CreateUserInput): User {
    const newUser: User = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    return newUser;
  },

  update(id: string, input: UpdateUserInput): User | undefined {
    const user = users.find((u) => u.id === id);
    if (!user) return undefined;

    if (input.name !== undefined) user.name = input.name;
    if (input.email !== undefined) user.email = input.email;

    return user;
  },

  remove(id: string): boolean {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    users.splice(index, 1);
    return true;
  },
};
