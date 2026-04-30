import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { authRouter } from './routes/auth.routes';
import { productRouter } from './routes/product.routes';
import { forumRouter } from './routes/forum.routes';
import { adminRouter } from './routes/admin.routes';
import { orderRouter } from './routes/order.routes';
import { viewRouter } from './routes/view.routes';
import { attachCurrentUser } from './middlewares/attachCurrentUser';
import { globalErrorHandler } from './middlewares/errorHandler';
import { env } from './config/env';
import { logger } from './config/logger';

const app = express();

// Trust Nginx reverse proxy (needed for rate limiter + correct client IP)
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],   // EJS inline scripts
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Intentá de nuevo en 15 minutos.' },
  skip: () => env.nodeEnv === 'development',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Intentá de nuevo en un momento.' },
  skip: () => env.nodeEnv === 'development',
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route morgan output through winston
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: () => env.nodeEnv === 'test',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachCurrentUser);
app.use(express.static(path.join(__dirname, 'public')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/', viewRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/products', apiLimiter, productRouter);
app.use('/api/forum', apiLimiter, forumRouter);
app.use('/api/orders', apiLimiter, orderRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).render('pages/not-found', { title: 'Página no encontrada' });
  }

  return res.status(404).json({ message: 'Ruta no encontrada' });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(globalErrorHandler);

export default app;
