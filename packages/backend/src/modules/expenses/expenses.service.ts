import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async create(restaurantId: string, actorId: string, dto: any) {
    const expense = await this.prisma.expense.create({ data: { restaurantId, createdBy: actorId, ...dto } });
    await this.audit.log({ restaurantId, branchId: dto.branchId, userId: actorId, action: 'EXPENSE_CREATE', entityType: 'Expense', entityId: expense.id, newData: { description: expense.description, amount: expense.amount } });
    return expense;
  }

  async findAll(restaurantId: string, f: any, allowedBranchIds?: string[]) {
    const where: any = { restaurantId, isDeleted: false };
    if (f.fromDate || f.toDate) {
      where.createdAt = {};
      if (f.fromDate) where.createdAt.gte = new Date(f.fromDate + 'T' + (f.fromTime || '00:00'));
      if (f.toDate) where.createdAt.lte = new Date(f.toDate + 'T' + (f.toTime || '23:59'));
    }
    if (f.branchId) where.branchId = f.branchId;
    else if (allowedBranchIds?.length) where.branchId = { in: allowedBranchIds };
    if (f.userId) where.createdBy = f.userId;

    const page = +(f.page ?? 1);
    const limit = +(f.limit ?? 20);
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { creator: { select: { fullName: true } }, branch: { select: { name: true } } } }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async update(id: string, restaurantId: string, actorId: string, dto: any) {
    const existing = await this.prisma.expense.findFirst({ where: { id, restaurantId, isDeleted: false } });
    if (!existing) throw new NotFoundException('Expense not found');
    const updated = await this.prisma.expense.update({ where: { id }, data: { ...dto, updatedBy: actorId } });
    await this.audit.log({ restaurantId, userId: actorId, action: 'EXPENSE_EDIT', entityType: 'Expense', entityId: id, oldData: { description: existing.description, amount: existing.amount }, newData: { description: updated.description, amount: updated.amount } });
    return updated;
  }

  async softDelete(id: string, restaurantId: string, actorId: string) {
    const existing = await this.prisma.expense.findFirst({ where: { id, restaurantId, isDeleted: false } });
    if (!existing) throw new NotFoundException('Expense not found');
    const deleted = await this.prisma.expense.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date(), deletedBy: actorId } });
    await this.audit.log({ restaurantId, userId: actorId, action: 'EXPENSE_DELETE', entityType: 'Expense', entityId: id, oldData: { description: existing.description, amount: existing.amount } });
    return deleted;
  }
}
