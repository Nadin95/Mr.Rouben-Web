import { Router } from 'express';
import {
  login,
  logout,
  register,
  resendVerification,
  verifyEmail
} from '../controllers/auth.controller';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/verify-email', verifyEmail);
authRouter.post('/resend-verification', resendVerification);
