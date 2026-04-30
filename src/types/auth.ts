import { Request } from 'express';
import { JwtUserPayload } from '../services/jwt.service';

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}
