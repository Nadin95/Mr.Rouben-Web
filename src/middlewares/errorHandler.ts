import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`${req.method} ${req.path} — ${err.message}`, { stack: err.stack });

  if (res.headersSent) return;

  if (req.accepts('html')) {
    res.status(500).render('pages/error', {
      title: 'Error interno',
      message: 'Ocurrió un error inesperado. Intentá de nuevo en unos momentos.',
    });
    return;
  }

  res.status(500).json({ message: 'Error interno del servidor.' });
};
