import type { AuthenticatedUser } from "modules/auth/auth.interface";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
