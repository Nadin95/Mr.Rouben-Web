import { NextFunction, Response } from 'express';
import { verifyToken } from '../services/jwt.service';
import { AuthenticatedRequest } from '../types/auth';

const extractToken = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
};

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  const token = extractToken(req);

  if (!token) {
    if (req.accepts('html')) {
      return res.redirect('/login');
    }

    return res.status(401).json({ message: 'Token requerido' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    if (req.accepts('html')) {
      return res.redirect('/login');
    }

    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};
