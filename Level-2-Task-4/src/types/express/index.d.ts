import { JwtPayload } from "../jwt.types";

// TypeScript "declaration merging": this extends Express's built-in
// Request interface globally, so `req.user` is recognized (and typed)
// everywhere in the app no need to manually cast `req as any` in
// every controller/middleware that needs the authenticated user.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
