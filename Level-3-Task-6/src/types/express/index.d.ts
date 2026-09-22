import { JwtPayload } from "../jwt.types";

// Declaration merging: adds `req.user` to Express's Request type globally.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
