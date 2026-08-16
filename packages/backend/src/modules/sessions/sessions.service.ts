import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async open(restaurantId: string, cashierId: string, dto: any) {
    const existing = await this.prisma.cashierSession.findFirst({ where: { cashierId, status: 'OPEN' } });
    if (existing) throw new BadRequestException('Cashier already has an open session');
    const session = await this.prisma.cashierSession.create({
      data: { restaurantId, cashierId, branchId: dto.branchId, openingAmount: dto.openingAmount, expectedCash: dto.openingAmount, status: 'OPEN' },
    });
    await this.audit.log({ restaurantId, branchId: dto.branchId, userId: cashierId, action: 'CASHIER_OPEN', entityType: 'CashierSession', entityId: session.id, newData: { openingAmount: dto.openingAmount } });
    return session;
  }

  async getActive(cashierId: string) {
    return this.prisma.cashierSession.findFirst({ where: { cashierId, status: 'OPEN' }, include: { branch: { select: { name: true } } } });
  }

  async findById(sessionId: string, restaurantId: string) {
    const s = await this.prisma.cashierSession.findFirst({
      where: { id: sessionId, restaurantId },
      include: { cashier: { select: { fullName: true, username: true } }, branch: { select: { name: true } }, _count: { select: { orders: true, expenses: true } } },
    });
    if (!s) throw new NotFoundException('Session not found');
    return s;
  }

  async close(sessionId: string, restaurantId: string, actorId: string, dto: any) {
    const session = await this.findById(sessionId, restaurantId);
    if (session.status === 'CLOSED') throw new BadRequestException('Session already closed');
    const difference = dto.closingAmount - session.expectedCash;
    const updated = await this.prisma.cashierSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED', closingAmount: dto.closingAmount, difference, closedAt: new Date(), closedBy: actorId },
    });
    await this.audit.log({ restaurantId, userId: actorId, action: 'CASHIER_CLOSE', entityType: 'CashierSession', entityId: sessionId, newData: { closingAmount: dto.closingAmount, expectedCash: session.expectedCash, difference } });
    return updated;
  }

  async findAll(restaurantId: string, branchId?: string, status?: string, page = 1, limit = 20) {
    const where: any = { restaurantId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.cashierSession.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { startedAt: 'desc' }, include: { cashier: { select: { fullName: true } }, branch: { select: { name: true } } } }),
      this.prisma.cashierSession.count({ where }),
    ]);
    return { data, total };
  }
}
