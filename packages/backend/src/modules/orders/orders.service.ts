import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CustomersService } from '../customers/customers.service';
import { OwnersService } from '../owners/owners.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { DailyNumberService } from './daily-number.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private customers: CustomersService,
    private owners: OwnersService,
    private whatsapp: WhatsAppService,
    private dailyNumber: DailyNumberService,
  ) {}

  private calcTotals(items: any[], dto: any) {
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const discountAmt = dto.discountType === 'PERCENTAGE' ? (subtotal * (dto.discountAmount ?? 0)) / 100 : (dto.discountAmount ?? 0);
    const netAmount = subtotal - discountAmt;
    const deliveryFee = dto.deliveryFee ?? 0;
    return {
      subtotal,
      discountAmount: discountAmt,
      netAmount,
      deliveryFee,
      totalAmount: netAmount + deliveryFee,
      restaurantDue: netAmount,
      driverDue: deliveryFee,
    };
  }

  async createOrder(restaurantId: string, actorId: string, dto: any, ipAddress?: string) {
    if (!dto.items?.length) throw new BadRequestException('Order must have at least one item');
    const totals = this.calcTotals(dto.items, dto);

    let ownerSnapshot: any = null;
    if (dto.orderType === 'OWNER' && dto.ownerId) ownerSnapshot = await this.owners.getSnapshot(dto.ownerId, restaurantId);

    let customerId: string | undefined;
    if (dto.customerPhone) {
      const cust = await this.customers.upsertByPhone(restaurantId, { phone: dto.customerPhone, name: dto.customerName, address: dto.customerAddress });
      customerId = cust.id;
      this.prisma.customer.update({ where: { id: cust.id }, data: { totalOrders: { increment: 1 }, totalSpent: { increment: totals.totalAmount }, lastOrderAt: new Date() } }).catch(() => {});
    }

    const order = await this.prisma.tx(async (tx) => {
      const { dailyNumber, orderDate } = await this.dailyNumber.nextDailyNumber(tx, dto.branchId);
      return tx.order.create({
        data: {
          restaurantId, branchId: dto.branchId, dailyNumber, orderDate,
          orderType: dto.orderType, status: 'IN_KITCHEN', source: 'CASHIER',
          paymentMethod: dto.paymentMethod,
          customerPhone: dto.customerPhone, customerName: dto.customerName, customerAddress: dto.customerAddress, customerId,
          ownerId: dto.ownerId, ownerSnapshot,
          subtotal: totals.subtotal, discountAmount: totals.discountAmount, discountType: dto.discountType,
          deliveryFee: totals.deliveryFee, netAmount: totals.netAmount, totalAmount: totals.totalAmount,
          restaurantDue: totals.restaurantDue, driverDue: totals.driverDue,
          sessionId: dto.sessionId, notes: dto.notes, createdBy: actorId,
          items: {
            create: dto.items.map((i: any) => ({
              productId: i.productId, productName: i.productName, productPrice: i.productPrice,
              sizeName: i.sizeName, sizePrice: i.sizePrice ?? 0, quantity: i.quantity,
              unitPrice: i.unitPrice, lineTotal: i.lineTotal, extras: i.extras ?? [], notes: i.notes,
            })),
          },
        },
        include: { items: true, branch: { select: { name: true } } },
      });
    });

    if (dto.sessionId) this.updateSessionTotals(dto.sessionId).catch(() => {});

    await this.audit.log({ restaurantId, branchId: dto.branchId, userId: actorId, action: 'CREATE_ORDER', entityType: 'Order', entityId: order.id, newData: { dailyNumber: order.dailyNumber, totalAmount: order.totalAmount }, ipAddress });

    if (dto.customerPhone) {
      this.whatsapp.sendOrderConfirmation(order, restaurantId).catch((e) => this.logger.warn('WhatsApp failed: ' + e.message));
    }
    return order;
  }

  async updateOrder(orderId: string, restaurantId: string, actorId: string, dto: any) {
    const existing = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId }, include: { items: true } });
    if (!existing) throw new NotFoundException('Order not found');
    if (existing.status !== 'IN_KITCHEN') throw new ForbiddenException(`Cannot edit order in status ${existing.status}. Only IN_KITCHEN editable.`);

    const items = dto.items ?? existing.items.map((i: any) => ({ productId: i.productId, productName: i.productName, productPrice: i.productPrice, sizeName: i.sizeName ?? undefined, sizePrice: i.sizePrice, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal, extras: i.extras as any, notes: i.notes ?? undefined }));

    const fakeDto = { ...dto, items, deliveryFee: dto.deliveryFee ?? existing.deliveryFee, discountAmount: dto.discountAmount ?? existing.discountAmount, discountType: dto.discountType ?? existing.discountType ?? undefined } as any;
    const totals = this.calcTotals(items as any, fakeDto);

    const updated = await this.prisma.tx(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId } });
      return tx.order.update({
        where: { id: orderId },
        data: {
          orderType: dto.orderType ?? existing.orderType,
          paymentMethod: dto.paymentMethod ?? existing.paymentMethod,
          customerPhone: dto.customerPhone ?? existing.customerPhone,
          customerName: dto.customerName ?? existing.customerName,
          customerAddress: dto.customerAddress ?? existing.customerAddress,
          discountType: dto.discountType ?? existing.discountType,
          discountAmount: totals.discountAmount,
          deliveryFee: totals.deliveryFee,
          subtotal: totals.subtotal, netAmount: totals.netAmount, totalAmount: totals.totalAmount,
          restaurantDue: totals.restaurantDue, driverDue: totals.driverDue,
          notes: dto.notes ?? existing.notes,
          items: {
            create: (items as any[]).map((i) => ({ productId: i.productId, productName: i.productName, productPrice: i.productPrice, sizeName: i.sizeName, sizePrice: i.sizePrice ?? 0, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal, extras: i.extras ?? [], notes: i.notes })),
          },
        },
        include: { items: true },
      });
    });

    await this.audit.log({ restaurantId, userId: actorId, action: 'EDIT_ORDER', entityType: 'Order', entityId: orderId, oldData: { totalAmount: existing.totalAmount, discountAmount: existing.discountAmount }, newData: { totalAmount: updated.totalAmount, discountAmount: updated.discountAmount } });

    if (existing.sessionId) this.updateSessionTotals(existing.sessionId).catch(() => {});
    return updated;
  }

  async cancelOrder(orderId: string, restaurantId: string, actorId: string, reason?: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'CANCELLED') throw new BadRequestException('Already cancelled');
    if (order.status === 'COMPLETED') throw new ForbiddenException('Cannot cancel completed order');
    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason } });
    await this.audit.log({ restaurantId, userId: actorId, action: 'CANCEL_ORDER', entityType: 'Order', entityId: orderId, oldData: { status: order.status }, newData: { status: 'CANCELLED', reason } });
    if (order.sessionId) this.updateSessionTotals(order.sessionId).catch(() => {});
    return updated;
  }

  async updateStatus(orderId: string, restaurantId: string, status: any, actorId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    const data: any = { status };
    if (status === 'COMPLETED') data.completedAt = new Date();
    const updated = await this.prisma.order.update({ where: { id: orderId }, data });
    if (order.sessionId) this.updateSessionTotals(order.sessionId).catch(() => {});
    return updated;
  }

  async findById(orderId: string, restaurantId: string) {
    const o = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        items: true,
        branch: { select: { name: true } },
        driverAssignment: { include: { driver: { select: { name: true, phone: true } } } },
        creator: { select: { fullName: true } },
        customer: { select: { name: true, phone: true, address: true } },
      },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async findAll(restaurantId: string, f: any, allowedBranchIds?: string[]) {
    const where: any = { restaurantId };
    if (f.fromDate || f.toDate) {
      where.createdAt = {};
      if (f.fromDate) where.createdAt.gte = new Date(f.fromDate + 'T' + (f.fromTime || '00:00'));
      if (f.toDate) where.createdAt.lte = new Date(f.toDate + 'T' + (f.toTime || '23:59'));
    }
    if (f.orderNumber) where.dailyNumber = parseInt(f.orderNumber);
    if (f.customerPhone) where.customerPhone = { contains: f.customerPhone };
    if (f.paymentMethod) where.paymentMethod = f.paymentMethod;
    if (f.orderType) where.orderType = f.orderType;
    if (f.status) where.status = f.status;
    if (f.source) where.source = f.source;
    if (f.branchId) where.branchId = f.branchId;
    else if (allowedBranchIds?.length) where.branchId = { in: allowedBranchIds };
    if (f.driverId) where.driverAssignment = { driverId: f.driverId, isActive: true };

    const page = +(f.page ?? 1);
    const limit = +(f.limit ?? 20);
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          items: { select: { productName: true, quantity: true, lineTotal: true } },
          branch: { select: { name: true } },
          creator: { select: { fullName: true } },
          driverAssignment: { where: { isActive: true }, include: { driver: { select: { name: true } } } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async updateSessionTotals(sessionId: string) {
    const orders = await this.prisma.order.findMany({ where: { sessionId, status: { not: 'CANCELLED' } }, select: { paymentMethod: true, restaurantDue: true } });
    const cashSales = orders.filter((o) => o.paymentMethod === 'CASH').reduce((s, o) => s + o.restaurantDue, 0);
    const walletSales = orders.filter((o) => o.paymentMethod === 'WALLET').reduce((s, o) => s + o.restaurantDue, 0);
    const visaSales = orders.filter((o) => o.paymentMethod === 'VISA').reduce((s, o) => s + o.restaurantDue, 0);
    const session = await this.prisma.cashierSession.findUnique({ where: { id: sessionId } });
    if (!session) return;
    const expenses = await this.prisma.expense.aggregate({ where: { sessionId, isDeleted: false }, _sum: { amount: true } });
    const cashExpenses = expenses._sum.amount ?? 0;
    const expectedCash = session.openingAmount + cashSales - cashExpenses;
    await this.prisma.cashierSession.update({ where: { id: sessionId }, data: { cashSales, walletSales, visaSales, cashExpenses, expectedCash } });
  }
}
