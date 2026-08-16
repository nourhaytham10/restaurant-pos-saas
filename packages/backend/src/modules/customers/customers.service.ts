import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findByPhone(restaurantId: string, phone: string) {
    return this.prisma.customer.findUnique({
      where: { restaurantId_phone: { restaurantId, phone } },
      include: { _count: { select: { orders: true } } },
    });
  }

  async upsertByPhone(restaurantId: string, dto: any) {
    const existing = await this.findByPhone(restaurantId, dto.phone);
    if (existing) {
      return this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: dto.name ?? existing.name,
          address: dto.address ?? existing.address,
          area: dto.area ?? existing.area,
          governorate: dto.governorate ?? existing.governorate,
          notes: dto.notes ?? existing.notes,
        },
      });
    }
    return this.prisma.customer.create({ data: { restaurantId, ...dto } });
  }

  async search(restaurantId: string, phone?: string, fromDate?: string, toDate?: string, fromTime?: string, toTime?: string, paymentMethod?: string, orderType?: string, branchId?: string, page = 1, limit = 20) {
    const orderWhere: any = { restaurantId };
    if (fromDate) orderWhere.createdAt = { ...(orderWhere.createdAt || {}), gte: new Date(fromDate + 'T' + (fromTime || '00:00')) };
    if (toDate) orderWhere.createdAt = { ...(orderWhere.createdAt || {}), lte: new Date(toDate + 'T' + (toTime || '23:59')) };
    if (paymentMethod) orderWhere.paymentMethod = paymentMethod;
    if (orderType) orderWhere.orderType = orderType;
    if (branchId) orderWhere.branchId = branchId;

    const customerWhere: any = { restaurantId };
    if (phone) customerWhere.phone = { contains: phone };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: customerWhere, skip: (page - 1) * limit, take: limit, orderBy: { lastOrderAt: 'desc' },
        include: {
          _count: { select: { orders: true } },
          orders: { where: orderWhere, select: { id: true, dailyNumber: true, totalAmount: true, createdAt: true, orderType: true, status: true }, orderBy: { createdAt: 'desc' }, take: 5 },
        },
      }),
      this.prisma.customer.count({ where: customerWhere }),
    ]);
    return { data, total, page, limit };
  }

  async getOrders(restaurantId: string, customerId: string, page = 1, limit = 20) {
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, restaurantId } });
    if (!c) throw new NotFoundException('Customer not found');
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ where: { customerId, restaurantId }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { items: true, branch: { select: { name: true } } } }),
      this.prisma.order.count({ where: { customerId, restaurantId } }),
    ]);
    return { customer: c, orders, total };
  }
}
