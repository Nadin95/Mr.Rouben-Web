import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface UserPayload extends JwtPayload {
      id: string;
      username: string;
      role: 'user' | 'admin';
      email: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
