import { userService } from "./user.service";
import { comparePassword } from "../utils/password.util";
import { signToken } from "../utils/jwt.util";
import { LoginInput } from "../types/user.types";

// Generic, deliberately vague error for failed login attempts.
// Do NOT let callers distinguish "email not found" vs "wrong password" —
// that distinction helps attackers enumerate valid emails (a real
// vulnerability class called "user enumeration").
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export const authService = {
  async login(input: LoginInput): Promise<{ token: string }> {
    const user = userService.findByEmailInternal(input.email);    
    // Same error whether the user doesn't exist OR the password is wrong.
    if (!user) {
      throw new InvalidCredentialsError();
    }
    
    const passwordMatches = await comparePassword(
      input.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const token = signToken({ sub: user.id, role: user.role });
    return { token };
  },
};