import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    if (user.isSuperAdmin) return true;
    if (!user.restaurantId) throw new ForbiddenException('TENANT_MISSING');

    // SECURITY: restaurantId must NEVER be in body for non-super-admin
    if (req.body?.restaurantId !== undefined) {
      this.logger.warn(`TENANT_VIOLATION_BODY user=${user.sub}`);
      throw new ForbiddenException('TENANT_VIOLATION: restaurantId not allowed in body');
    }

    const q = req.query?.restaurantId;
    const p = req.params?.restaurantId;
    for (const c of [q, p]) {
      if (c && c !== user.restaurantId) {
        this.logger.warn(`TENANT_VIOLATION user=${user.sub} tried=${c}`);
        throw new ForbiddenException('TENANT_VIOLATION');
      }
    }
    req.tenantId = user.restaurantId;

    if (user.role === 'CASHIER' && user.branchId) {
      for (const c of [req.body?.branchId, req.query?.branchId, req.params?.branchId]) {
        if (c && c !== user.branchId) throw new ForbiddenException('BRANCH_VIOLATION');
      }
      req.branchId = user.branchId;
    }

    if (user.role === 'SUPERVISOR') {
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub }, select: { allowedBranchIds: true, branchId: true } });
      const allowed: string[] = (dbUser?.allowedBranchIds as string[]) ?? [];
      const effective = dbUser?.branchId ? [dbUser.branchId, ...allowed] : allowed;
      const cand = req.body?.branchId ?? req.query?.branchId ?? req.params?.branchId;
      if (cand && effective.length && !effective.includes(cand)) throw new ForbiddenException('BRANCH_VIOLATION');
      req.allowedBranchIds = effective;
    }

    const rest = await this.prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { isActive: true, subscriptionStatus: true, subscriptionEnd: true },
    });
    if (!rest?.isActive) throw new ForbiddenException('RESTAURANT_DISABLED');
    if (['SUSPENDED', 'CANCELLED'].includes(rest.subscriptionStatus)) throw new ForbiddenException('SUBSCRIPTION_SUSPENDED');
    if (rest.subscriptionEnd && rest.subscriptionEnd < new Date() && rest.subscriptionStatus !== 'TRIAL') throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    return true;
  }
}
