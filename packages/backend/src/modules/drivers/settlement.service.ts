import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SettlementService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async create(restaurantId: string, actorId: string, driverId: string, orderIds: string[], paidAmount: number, branchId?: string, notes?: string) {
    if (!orderIds.length) throw new BadRequestException('Select at least one order');

    const orders = await this.prisma.order.findMany({
      where: {
        id: { in: orderIds }, restaurantId,
        driverAssignment: { driverId, isActive: true },
        status: { not: 'CANCELLED' },
      },
      select: { id: true, driverDue: true },
    });
    if (orders.length !== orderIds.length) throw new BadRequestException('Some orders invalid, not assigned, or already settled');

    const existing = await this.prisma.settlementItem.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true } });
    if (existing.length > 0) throw new BadRequestException('Orders already settled: ' + existing.map((e) => e.orderId).join(', '));

    const totalDue = orders.reduce((s, o) => s + o.driverDue, 0);
    const settlement = await this.prisma.driverSettlement.create({
      data: {
        restaurantId, driverId, branchId, totalDue, paidAmount,
        remaining: totalDue - paidAmount, settledBy: actorId, notes,
        items: { create: orders.map((o) => ({ orderId: o.id, deliveryFee: o.driverDue })) },
      },
      include: { items: true, driver: { select: { name: true } } },
    });

    await this.audit.log({ restaurantId, userId: actorId, action: 'SETTLEMENT', entityType: 'DriverSettlement', entityId: settlement.id, newData: { driverId, totalDue, paidAmount, orderCount: orderIds.length } });
    return settlement;
  }

  async findByDriver(driverId: string, restaurantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.driverSettlement.findMany({ where: { driverId, restaurantId }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { items: true } }),
      this.prisma.driverSettlement.count({ where: { driverId, restaurantId } }),
    ]);
    return { data, total };
  }
}
