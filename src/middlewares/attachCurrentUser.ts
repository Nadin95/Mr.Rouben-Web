import { NextFunction, Response } from 'express';
import { env } from '../config/env';
import { verifyToken } from '../services/jwt.service';
import { AuthenticatedRequest } from '../types/auth';

const buildWhatsappLink = (): string => {
  const digits = String(env.whatsappAdminPhone || '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  const text = encodeURIComponent('Hola! Tengo una consulta sobre Mr. Rouben.');
  return `https://wa.me/${digits}?text=${text}`;
};

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

export const attachCurrentUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  res.locals.whatsappLink = buildWhatsappLink();

  const token = extractToken(req);

  if (!token) {
    res.locals.currentUser = null;
    next();
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    res.locals.currentUser = decoded;
  } catch {
    res.locals.currentUser = null;
  }

  next();
};
