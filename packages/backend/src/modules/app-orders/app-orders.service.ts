import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { PosGateway } from '../../gateway/pos.gateway';

@Injectable()
export class AppOrdersService {
  private readonly logger = new Logger(AppOrdersService.name);
  constructor(private prisma: PrismaService, private audit: AuditService, private orders: OrdersService, private gateway: PosGateway) {}

  async createFromApp(dto: any) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { code: dto.restaurantCode } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (!restaurant.isActive) throw new BadRequestException('Restaurant is disabled');

    const dup = await this.prisma.appOrder.findUnique({ where: { externalId: dto.externalId } });
    if (dup) throw new ConflictException('Duplicate externalId');

    const subtotal = dto.items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
    const appOrder = await this.prisma.appOrder.create({
      data: {
        restaurantId: restaurant.id, branchId: dto.branchId, externalId: dto.externalId,
        customerPhone: dto.customerPhone, customerName: dto.customerName, customerAddress: dto.customerAddress,
        orderType: dto.orderType, paymentMethod: dto.paymentMethod, items: dto.items,
        subtotal, deliveryFee: dto.deliveryFee, totalAmount: subtotal + dto.deliveryFee,
        notes: dto.notes, status: 'PENDING',
      },
    });

    this.gateway.notifyNewAppOrder(restaurant.id, {
      id: appOrder.id, externalId: appOrder.externalId, customerName: appOrder.customerName,
      customerPhone: appOrder.customerPhone, totalAmount: appOrder.totalAmount,
      itemCount: dto.items.length, createdAt: appOrder.createdAt,
    });
    return { success: true, appOrderId: appOrder.id };
  }

  async getPending(restaurantId: string) {
    return this.prisma.appOrder.findMany({ where: { restaurantId, status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
  }

  async accept(appOrderId: string, restaurantId: string, actorId: string, branchId: string) {
    const appOrder = await this.prisma.appOrder.findFirst({ where: { id: appOrderId, restaurantId } });
    if (!appOrder) throw new NotFoundException('App order not found');
    if (appOrder.status !== 'PENDING') throw new BadRequestException(`App order already ${appOrder.status}`);

    const items = (appOrder.items as any[]).map((i) => ({ productId: '', productName: i.productName, productPrice: i.price, sizeName: i.size, sizePrice: 0, quantity: i.qty, unitPrice: i.price, lineTotal: i.price * i.qty, extras: i.extras ?? [] }));
    const effectiveBranchId = branchId || appOrder.branchId || '';
    if (!effectiveBranchId) throw new BadRequestException('branchId required');

    const order = await this.orders.createOrder(restaurantId, actorId, {
      branchId: effectiveBranchId, orderType: appOrder.orderType, paymentMethod: appOrder.paymentMethod,
      items, deliveryFee: appOrder.deliveryFee,
      customerPhone: appOrder.customerPhone, customerName: appOrder.customerName ?? undefined,
      customerAddress: appOrder.customerAddress ?? undefined,
      notes: `[App Order ${appOrder.externalId}] ${appOrder.notes ?? ''}`,
    } as any);

    await this.prisma.appOrder.update({ where: { id: appOrderId }, data: { status: 'IN_KITCHEN', orderId: order.id, acceptedBy: actorId, acceptedAt: new Date() } });
    await this.audit.log({ restaurantId, userId: actorId, action: 'APP_ORDER_ACCEPT', entityType: 'AppOrder', entityId: appOrderId, newData: { orderId: order.id, dailyNumber: order.dailyNumber } });
    return order;
  }

  async reject(appOrderId: string, restaurantId: string, actorId: string, reason?: string) {
    const appOrder = await this.prisma.appOrder.findFirst({ where: { id: appOrderId, restaurantId } });
    if (!appOrder) throw new NotFoundException('App order not found');
    if (appOrder.status !== 'PENDING') throw new BadRequestException(`App order already ${appOrder.status}`);
    await this.prisma.appOrder.update({ where: { id: appOrderId }, data: { status: 'REJECTED', rejectReason: reason, rejectedBy: actorId, rejectedAt: new Date() } });
    await this.audit.log({ restaurantId, userId: actorId, action: 'APP_ORDER_REJECT', entityType: 'AppOrder', entityId: appOrderId, newData: { reason } });
    return { success: true };
  }
}
