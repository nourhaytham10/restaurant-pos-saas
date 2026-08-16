import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtPayload, TokenPair } from '../../common/interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try { return await argon2.verify(hash, plain); } catch { return false; }
  }

  private buildPayload(user: {
    id: string; username: string; role: string;
    restaurantId: string | null; branchId: string | null; isSuperAdmin: boolean;
  }): JwtPayload {
    return {
      sub: user.id,
      username: user.username,
      role: user.role as any,
      restaurantId: user.restaurantId,
      branchId: user.branchId,
      isSuperAdmin: user.isSuperAdmin,
      tokenId: uuidv4(),
    };
  }

  async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    // BUG FIX: safe parsing of expiresIn
    const expiresIn = parseInt(String(this.config.get('JWT_ACCESS_EXPIRES_IN', '900')).replace(/\D/g, ''), 10) || 900;
    return { accessToken, refreshToken, expiresIn };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        restaurant: { select: { name: true, isActive: true, subscriptionStatus: true } },
        branch: { select: { name: true, isActive: true } },
      },
    });

    if (!user) {
      await this.audit.log({ action: 'LOGIN_FAILED', entityType: 'User', ipAddress, userAgent, newData: { username: dto.username, reason: 'USER_NOT_FOUND' } });
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    if (!user.isActive) {
      await this.audit.log({ restaurantId: user.restaurantId, userId: user.id, action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, ipAddress, userAgent, newData: { reason: 'USER_DISABLED' } });
      throw new ForbiddenException('USER_DISABLED');
    }
    if (user.restaurant && !user.restaurant.isActive) {
      await this.audit.log({ restaurantId: user.restaurantId, userId: user.id, action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, ipAddress, userAgent, newData: { reason: 'RESTAURANT_DISABLED' } });
      throw new ForbiddenException('RESTAURANT_DISABLED');
    }
    if (user.restaurant?.subscriptionStatus === 'SUSPENDED' || user.restaurant?.subscriptionStatus === 'CANCELLED') {
      await this.audit.log({ restaurantId: user.restaurantId, userId: user.id, action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, ipAddress, userAgent, newData: { reason: 'SUBSCRIPTION_SUSPENDED' } });
      throw new ForbiddenException('SUBSCRIPTION_SUSPENDED');
    }

    const valid = await this.verifyPassword(user.passwordHash, dto.password);
    if (!valid) {
      await this.audit.log({ restaurantId: user.restaurantId, branchId: user.branchId, userId: user.id, action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, ipAddress, userAgent, newData: { reason: 'INVALID_PASSWORD' } });
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.generateTokens(this.buildPayload(user));

    await this.audit.log({ restaurantId: user.restaurantId, branchId: user.branchId, userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id, ipAddress, userAgent });

    return {
      tokens,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        restaurantId: user.restaurantId,
        branchId: user.branchId,
        restaurantName: user.restaurant?.name,
        branchName: user.branch?.name,
        permissions: (user.permissions as string[]) ?? [],
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user?.isActive) throw new UnauthorizedException('USER_DISABLED');
      return this.generateTokens(this.buildPayload(user));
    } catch {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }
  }

  async getAvailableAccounts(branchId?: string) {
    const where: any = { isActive: true, isSuperAdmin: false };
    if (branchId) where.branchId = branchId;
    return this.prisma.user.findMany({
      where,
      select: { username: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
      take: 50,
    });
  }
}
