import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(restaurantId: string, f: any): any {
    const where: any = { restaurantId, status: { not: 'CANCELLED' } };
    if (f.fromDate || f.toDate) {
      where.createdAt = {};
      if (f.fromDate) where.createdAt.gte = new Date(f.fromDate + 'T' + (f.fromTime || '00:00'));
      if (f.toDate) where.createdAt.lte = new Date(f.toDate + 'T' + (f.toTime || '23:59'));
    }
    if (f.branchId) where.branchId = f.branchId;
    else if (f.allowedBranchIds?.length) where.branchId = { in: f.allowedBranchIds };
    if (f.paymentMethod) where.paymentMethod = f.paymentMethod;
    if (f.orderType) where.orderType = f.orderType;
    if (f.source) where.source = f.source;
    if (f.driverId) where.driverAssignment = { driverId: f.driverId, isActive: true };
    return where;
  }

  async getFinancialSummary(restaurantId: string, f: any) {
    const where = this.buildWhere(restaurantId, f);
    const [orders, expenses] = await Promise.all([
      this.prisma.order.findMany({ where, select: { totalAmount: true, restaurantDue: true, driverDue: true, discountAmount: true, deliveryFee: true, subtotal: true, paymentMethod: true } }),
      this.prisma.expense.aggregate({
        where: { restaurantId, isDeleted: false, ...(f.branchId ? { branchId: f.branchId } : {}), ...(f.fromDate ? { createdAt: { gte: new Date(f.fromDate + 'T' + (f.fromTime || '00:00')) } } : {}) },
        _sum: { amount: true }, _count: true,
      }),
    ]);
    const grossSales = orders.reduce((s, o) => s + o.subtotal, 0);
    const discounts = orders.reduce((s, o) => s + o.discountAmount, 0);
    const netSales = orders.reduce((s, o) => s + o.restaurantDue, 0);
    const deliveryFees = orders.reduce((s, o) => s + o.deliveryFee, 0);
    const totalCollected = orders.reduce((s, o) => s + o.totalAmount, 0);
    const cashSales = orders.filter((o) => o.paymentMethod === 'CASH').reduce((s, o) => s + o.restaurantDue, 0);
    const walletSales = orders.filter((o) => o.paymentMethod === 'WALLET').reduce((s, o) => s + o.restaurantDue, 0);
    const visaSales = orders.filter((o) => o.paymentMethod === 'VISA').reduce((s, o) => s + o.restaurantDue, 0);
    const totalExpenses = expenses._sum.amount ?? 0;
    return {
      grossSales, discounts, netSales, deliveryFees, totalCollected,
      restaurantDue: netSales, driverDue: deliveryFees,
      cashSales, walletSales, visaSales, totalExpenses,
      netAfterExpenses: netSales - totalExpenses,
      numberOfOrders: orders.length,
      averageOrderValue: orders.length ? netSales / orders.length : 0,
      expenseCount: expenses._count,
    };
  }

  async getProductAnalysis(restaurantId: string, f: any) {
    const where = this.buildWhere(restaurantId, f);
    const items = await this.prisma.orderItem.findMany({
      where: { order: where },
      select: { productName: true, quantity: true, lineTotal: true, product: { select: { category: { select: { name: true } } } } },
    });
    const productMap = new Map<string, { units: number; sales: number; categoryName: string }>();
    for (const i of items) {
      const e = productMap.get(i.productName) ?? { units: 0, sales: 0, categoryName: i.product?.category?.name ?? '—' };
      e.units += i.quantity; e.sales += i.lineTotal;
      productMap.set(i.productName, e);
    }
    const products = Array.from(productMap.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.sales - a.sales);
    const categoryMap = new Map<string, number>();
    for (const p of products) categoryMap.set(p.categoryName, (categoryMap.get(p.categoryName) ?? 0) + p.sales);
    return {
      topProducts: products.slice(0, 10),
      lowestProducts: [...products].reverse().slice(0, 10),
      categorySales: Array.from(categoryMap.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales),
      totalUnitsSold: items.reduce((s, i) => s + i.quantity, 0),
    };
  }

  async getSalesOverTime(restaurantId: string, f: any) {
    const where = this.buildWhere(restaurantId, f);
    const orders = await this.prisma.order.findMany({ where, select: { createdAt: true, restaurantDue: true }, orderBy: { createdAt: 'asc' } });
    const dailyMap = new Map<string, { sales: number; orders: number }>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const d = dailyMap.get(key) ?? { sales: 0, orders: 0 };
      d.sales += o.restaurantDue; d.orders += 1;
      dailyMap.set(key, d);
    }
    return Array.from(dailyMap.entries()).map(([date, d]) => ({ date, ...d }));
  }

  async getSalesByBranch(restaurantId: string, f: any) {
    const where = this.buildWhere(restaurantId, f);
    const rows = await this.prisma.order.groupBy({ by: ['branchId'], where, _sum: { restaurantDue: true }, _count: true });
    const branches = await this.prisma.branch.findMany({ where: { restaurantId }, select: { id: true, name: true } });
    const nameMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
    return rows.map((r) => ({ branchName: nameMap[r.branchId] ?? r.branchId, sales: r._sum.restaurantDue ?? 0, orders: r._count }));
  }

  async getSalesByPaymentMethod(restaurantId: string, f: any) {
    const where = this.buildWhere(restaurantId, f);
    const rows = await this.prisma.order.groupBy({ by: ['paymentMethod'], where, _sum: { restaurantDue: true }, _count: true });
    return rows.map((r) => ({ method: r.paymentMethod, sales: r._sum.restaurantDue ?? 0, count: r._count }));
  }

  async getDriverActivity(restaurantId: string, f: any) {
    const where = this.buildWhere(restaurantId, f);
    const assignments = await this.prisma.driverAssignment.findMany({
      where: { isActive: true, order: where },
      include: { driver: { select: { name: true } }, order: { select: { driverDue: true } } },
    });
    const map = new Map<string, { name: string; orders: number; fees: number }>();
    for (const a of assignments) {
      const d = map.get(a.driverId) ?? { name: a.driver.name, orders: 0, fees: 0 };
      d.orders += 1; d.fees += a.order.driverDue;
      map.set(a.driverId, d);
    }
    return Array.from(map.values()).sort((a, b) => b.orders - a.orders);
  }
}
