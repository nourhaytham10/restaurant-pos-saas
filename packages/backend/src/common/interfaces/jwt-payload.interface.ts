import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  restaurantId: string | null;
  branchId: string | null;
  isSuperAdmin: boolean;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
