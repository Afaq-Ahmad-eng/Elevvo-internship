// Domain interface for the User resource.
// Naming convention: <domain>.types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO timestamp
}

// Shape of the payload accepted when creating a user.
// Note: no "id" or "createdAt" those are generated server-side.
export type CreateUserInput = Omit<User, "id" | "createdAt">;

// Shape of the payload accepted when updating a user.
// Partial: all fields optional, since PUT here behaves like a partial update.
export type UpdateUserInput = Partial<CreateUserInput>;
