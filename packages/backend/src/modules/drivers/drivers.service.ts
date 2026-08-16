import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: any) { return this.prisma.driver.create({ data: { restaurantId, ...dto } }); }

  async findAll(restaurantId: string, branchId?: string, activeOnly = false) {
    const where: any = { restaurantId };
    if (branchId) where.OR = [{ branchId }, { branchId: null }];
    if (activeOnly) where.isActive = true;
    return this.prisma.driver.findMany({ where, orderBy: { name: 'asc' }, include: { _count: { select: { assignments: true } } } });
  }

  async findById(id: string, restaurantId: string) {
    const d = await this.prisma.driver.findFirst({ where: { id, restaurantId } });
    if (!d) throw new NotFoundException('Driver not found');
    return d;
  }

  async update(id: string, restaurantId: string, dto: any) {
    await this.findById(id, restaurantId);
    return this.prisma.driver.update({ where: { id }, data: dto });
  }

  async getCurrentDue(driverId: string, restaurantId: string) {
    const settled = await this.prisma.settlementItem.findMany({ select: { orderId: true } });
    const result = await this.prisma.order.aggregate({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        driverAssignment: { driverId, isActive: true },
        id: { notIn: settled.map((x) => x.orderId) },
      },
      _sum: { driverDue: true },
      _count: true,
    });
    return { currentDue: result._sum.driverDue ?? 0, orderCount: result._count };
  }
}
