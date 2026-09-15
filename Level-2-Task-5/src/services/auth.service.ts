import { userService } from "./user.service";
import { comparePassword } from "../utils/password.util";
import { signToken } from "../utils/jwt.util";
import { LoginInput } from "../types/dto.types";
import { AppError } from "../middlewares/error-handler.middleware";

export const authService = {
  async login(input: LoginInput): Promise<{ token: string }> {
    const user = await userService.findByEmailInternal(input.email);

    // Same generic error whether the email doesn't exist OR the password
    // is wrong — prevents user enumeration.
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const passwordMatches = await comparePassword(
      input.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = signToken({ sub: user.id, role: user.role });
    return { token };
  },
};
