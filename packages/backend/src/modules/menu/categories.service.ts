import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: any) {
    const dup = await this.prisma.category.findFirst({ where: { restaurantId, name: dto.name } });
    if (dup) throw new ConflictException('Category name already exists');
    return this.prisma.category.create({ data: { restaurantId, ...dto } });
  }

  async findAll(restaurantId: string, activeOnly = false) {
    return this.prisma.category.findMany({ where: { restaurantId, ...(activeOnly ? { isActive: true } : {}) }, orderBy: { displayOrder: 'asc' }, include: { _count: { select: { products: true } } } });
  }

  async update(id: string, restaurantId: string, dto: any) {
    const c = await this.prisma.category.findFirst({ where: { id, restaurantId } });
    if (!c) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data: dto });
  }
}
