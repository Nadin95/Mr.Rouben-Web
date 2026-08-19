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
// Build Content Security Policy and include Cloudflare R2 endpoint if configured
const imgSrcList = ["'self'", 'data:', 'https://res.cloudinary.com'];
try {
  if (env.r2Endpoint) {
    // extract origin (scheme + host) from configured endpoint
    const origin = new URL(String(env.r2Endpoint)).origin;
    imgSrcList.push(origin);
  } else if (env.r2AccountId) {
    imgSrcList.push(`https://${env.r2AccountId}.r2.cloudflarestorage.com`);
  }
} catch (e) {
  // if URL parsing fails, skip adding R2 host to CSP
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],   // EJS inline scripts
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: imgSrcList,
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
const uploadsStaticPath = path.isAbsolute(env.uploadsDir) ? env.uploadsDir : path.join(process.cwd(), env.uploadsDir);
app.use('/uploads', express.static(uploadsStaticPath));
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
