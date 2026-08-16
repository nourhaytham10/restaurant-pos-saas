import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OwnersService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: any) { return this.prisma.owner.create({ data: { restaurantId, ...dto } }); }

  async findAll(restaurantId: string, branchId?: string, search?: string) {
    const where: any = { restaurantId, isActive: true };
    if (branchId) where.OR = [{ branchId }, { branchId: null }];
    if (search) where.name = { contains: search, mode: 'insensitive' };
    return this.prisma.owner.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findById(id: string, restaurantId: string) {
    const o = await this.prisma.owner.findFirst({ where: { id, restaurantId } });
    if (!o) throw new NotFoundException('Owner not found');
    return o;
  }

  async update(id: string, restaurantId: string, dto: any) {
    await this.findById(id, restaurantId);
    return this.prisma.owner.update({ where: { id }, data: dto });
  }

  async getSnapshot(id: string, restaurantId: string) {
    const o = await this.findById(id, restaurantId);
    return { name: o.name, phone: o.phone, address: o.address };
  }
}
