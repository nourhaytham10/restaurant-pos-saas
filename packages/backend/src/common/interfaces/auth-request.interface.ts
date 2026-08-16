import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

export interface AuthRequest extends Request {
  user: JwtPayload;
  tenantId?: string;
  branchId?: string | null;
  allowedBranchIds?: string[];
}
