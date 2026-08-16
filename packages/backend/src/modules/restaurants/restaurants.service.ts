import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const exists = await this.prisma.restaurant.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Restaurant code already exists');
    return this.prisma.restaurant.create({
      data: {
        name: dto.name, code: dto.code, phone: dto.phone, address: dto.address,
        governorate: dto.governorate, planId: dto.planId,
        subscriptionStart: dto.subscriptionStart ? new Date(dto.subscriptionStart) : undefined,
        subscriptionEnd: dto.subscriptionEnd ? new Date(dto.subscriptionEnd) : undefined,
        subscriptionStatus: dto.planId ? 'ACTIVE' : 'TRIAL',
      },
    });
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { plan: { select: { name: true } }, _count: { select: { branches: true, users: true, orders: true } } },
      }),
      this.prisma.restaurant.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string) {
    const r = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { plan: true, _count: { select: { branches: true, users: true, orders: true, customers: true } } },
    });
    if (!r) throw new NotFoundException('Restaurant not found');
    return r;
  }

  async update(id: string, dto: any) {
    await this.findById(id);
    return this.prisma.restaurant.update({
      where: { id },
      data: {
        ...dto,
        subscriptionStart: dto.subscriptionStart ? new Date(dto.subscriptionStart) : undefined,
        subscriptionEnd: dto.subscriptionEnd ? new Date(dto.subscriptionEnd) : undefined,
      },
    });
  }

  async toggleActive(id: string, isActive: boolean) {
    await this.findById(id);
    return this.prisma.restaurant.update({ where: { id }, data: { isActive } });
  }
}
