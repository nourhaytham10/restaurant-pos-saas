import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createItem(restaurantId: string, dto: any) {
    return this.prisma.inventoryItem.create({ data: { restaurantId, ...dto, currentQty: dto.currentQty ?? 0, minQty: dto.minQty ?? 0 } });
  }

  async findAllItems(restaurantId: string, branchId?: string, lowStock = false) {
    const where: any = { restaurantId, isActive: true };
    if (branchId) where.OR = [{ branchId }, { branchId: null }];
    let items = await this.prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
    // BUG FIX: filter low stock in-memory (each item vs its own minQty)
    if (lowStock) items = items.filter((i) => i.currentQty <= i.minQty);
    return items;
  }

  async recordMovement(restaurantId: string, actorId: string, dto: any) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.itemId, restaurantId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    const delta = dto.type === 'STOCK_IN' || dto.type === 'RETURN' ? dto.quantity : -dto.quantity;
    const newQty = item.currentQty + delta;
    if (newQty < 0) throw new BadRequestException(`Insufficient stock. Current: ${item.currentQty}, requested: ${dto.quantity}`);

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({ data: { restaurantId, branchId: dto.branchId, itemId: dto.itemId, type: dto.type, quantity: dto.quantity, reason: dto.reason, userId: actorId } }),
      this.prisma.inventoryItem.update({ where: { id: dto.itemId }, data: { currentQty: newQty } }),
    ]);

    await this.audit.log({ restaurantId, userId: actorId, action: 'INVENTORY_MOVEMENT', entityType: 'InventoryItem', entityId: dto.itemId, oldData: { currentQty: item.currentQty }, newData: { currentQty: newQty, type: dto.type, qty: dto.quantity } });
    return movement;
  }

  async createPurchase(restaurantId: string, actorId: string, dto: any) {
    const totalCost = dto.items.reduce((s: number, i: any) => s + i.cost * i.quantity, 0);
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          restaurantId, supplier: dto.supplier, invoiceNo: dto.invoiceNo, branchId: dto.branchId, notes: dto.notes, totalCost,
          items: { create: dto.items.map((i: any) => ({ itemId: i.itemId, quantity: i.quantity, cost: i.cost })) },
        },
      });
      for (const item of dto.items) {
        const inv = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });
        if (!inv) continue;
        await tx.inventoryItem.update({ where: { id: item.itemId }, data: { currentQty: inv.currentQty + item.quantity } });
        await tx.stockMovement.create({ data: { restaurantId, branchId: dto.branchId, itemId: item.itemId, type: 'STOCK_IN', quantity: item.quantity, reason: `Purchase ${purchase.id}`, userId: actorId, purchaseId: purchase.id } });
      }
      return purchase;
    });
  }

  async getMovements(restaurantId: string, itemId?: string, page = 1, limit = 20) {
    const where: any = { restaurantId };
    if (itemId) where.itemId = itemId;
    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { item: { select: { name: true, unit: true } } } }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return { data, total };
  }
}
