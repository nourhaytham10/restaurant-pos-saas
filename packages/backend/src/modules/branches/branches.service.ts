import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: any) {
    const dup = await this.prisma.branch.findFirst({ where: { restaurantId, name: dto.name } });
    if (dup) throw new ConflictException('Branch name already exists');
    return this.prisma.branch.create({ data: { restaurantId, name: dto.name, address: dto.address, phone: dto.phone } });
  }

  async findAll(restaurantId: string, userId: string, role: string, allowedBranchIds?: string[]) {
    const where: any = { restaurantId };
    if (role === 'CASHIER') {
      const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { branchId: true } });
      if (u?.branchId) where.id = u.branchId;
    }
    if (role === 'SUPERVISOR' && allowedBranchIds?.length) where.id = { in: allowedBranchIds };
    return this.prisma.branch.findMany({ where, orderBy: { createdAt: 'asc' }, include: { _count: { select: { orders: true, users: true } } } });
  }

  async findById(id: string, restaurantId: string) {
    const b = await this.prisma.branch.findFirst({ where: { id, restaurantId } });
    if (!b) throw new NotFoundException('Branch not found');
    return b;
  }

  async update(id: string, restaurantId: string, dto: any) {
    await this.findById(id, restaurantId);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async toggleActive(id: string, restaurantId: string, isActive: boolean) {
    await this.findById(id, restaurantId);
    return this.prisma.branch.update({ where: { id }, data: { isActive } });
  }
}
