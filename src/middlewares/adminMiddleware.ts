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

  const isNadine = req.user.username.toLowerCase() === 'nadine';

  if (req.user.role !== 'admin' || !isNadine) {
    if (req.accepts('html')) {
      return res.redirect('/');
    }

    return res.status(403).json({ message: 'Acceso denegado. Solo administrador autorizado.' });
  }

  next();
};
