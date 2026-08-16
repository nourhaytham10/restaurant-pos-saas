import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async create(restaurantId: string, actorId: string, dto: any) {
    const product = await this.prisma.product.create({
      data: {
        restaurantId, name: dto.name, categoryId: dto.categoryId, basePrice: dto.basePrice,
        description: dto.description, imageUrl: dto.imageUrl, displayOrder: dto.displayOrder ?? 0,
        sizes: dto.sizes ?? [], variants: dto.variants ?? [], extras: dto.extras ?? [],
      },
    });
    await this.audit.log({ restaurantId, userId: actorId, action: 'PRODUCT_CHANGE', entityType: 'Product', entityId: product.id, newData: { name: product.name, basePrice: product.basePrice } });
    return product;
  }

  async findAll(restaurantId: string, categoryId?: string, activeOnly = false) {
    return this.prisma.product.findMany({
      where: { restaurantId, ...(categoryId ? { categoryId } : {}), ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { displayOrder: 'asc' },
      include: { category: { select: { name: true } } },
    });
  }

  async getMenuForPOS(restaurantId: string) {
    return this.prisma.category.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          select: { id: true, name: true, basePrice: true, imageUrl: true, sizes: true, variants: true, extras: true, description: true },
        },
      },
    });
  }

  async findById(id: string, restaurantId: string) {
    const p = await this.prisma.product.findFirst({ where: { id, restaurantId } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async update(id: string, restaurantId: string, actorId: string, dto: any) {
    const existing = await this.findById(id, restaurantId);
    const updated = await this.prisma.product.update({ where: { id }, data: dto });
    if (dto.basePrice !== undefined && dto.basePrice !== existing.basePrice) {
      await this.audit.log({ restaurantId, userId: actorId, action: 'PRICE_CHANGE', entityType: 'Product', entityId: id, oldData: { basePrice: existing.basePrice }, newData: { basePrice: updated.basePrice } });
    }
    return updated;
  }
}
