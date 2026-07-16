import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';

export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const adminUsername = (process.env.ADMIN_USERNAME || 'mrrouben_admin').toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || 'nadine@mrrouben.com').toLowerCase();
  
  const isAdmin =
    req.user.role === 'admin' &&
    (req.user.username.toLowerCase() === adminUsername ||
     req.user.email.toLowerCase() === adminEmail);

  if (!isAdmin) {
    if (req.accepts('html')) {
      return res.redirect('/');
    }

    return res.status(403).json({ message: 'Acceso denegado. Solo administrador autorizado.' });
  }

  next();
};
