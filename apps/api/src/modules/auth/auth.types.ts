
import type { UserRole, UserStatus } from "../../generated/prisma/client.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AuthContext {
  user: AuthenticatedUser;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
