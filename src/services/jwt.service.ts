import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtUserPayload {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export const signToken = (payload: JwtUserPayload): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    issuer: env.jwtIssuer,
    audience: env.jwtAudience
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, env.jwtSecret, {
    issuer: env.jwtIssuer,
    audience: env.jwtAudience
  } as jwt.VerifyOptions) as JwtUserPayload;
};
