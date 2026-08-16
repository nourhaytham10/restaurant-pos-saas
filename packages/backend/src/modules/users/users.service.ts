import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditService, private auth: AuthService) {}

  async create(restaurantId: string, actorId: string, dto: any) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new ConflictException('Username already taken');
    const user = await this.prisma.user.create({
      data: {
        restaurantId, fullName: dto.fullName, username: dto.username,
        passwordHash: await this.auth.hashPassword(dto.password),
        phone: dto.phone, role: dto.role, branchId: dto.branchId,
        permissions: dto.permissions ?? [], allowedBranchIds: dto.allowedBranchIds ?? [],
      },
    });
    await this.audit.log({ restaurantId, userId: actorId, action: 'USER_CHANGE', entityType: 'User', entityId: user.id, newData: { username: user.username, role: user.role } });
    const { passwordHash, ...safe } = user as any;
    return safe;
  }

  async findAll(restaurantId: string, page = 1, limit = 20, search?: string) {
    const where: any = { restaurantId, isSuperAdmin: false };
    if (search) where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ];
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        select: { id: true, fullName: true, username: true, phone: true, role: true, isActive: true, branchId: true, lastLoginAt: true, createdAt: true, branch: { select: { name: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string, restaurantId: string) {
    const u = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: { id: true, fullName: true, username: true, phone: true, role: true, isActive: true, permissions: true, allowedBranchIds: true, branchId: true, lastLoginAt: true, createdAt: true, branch: { select: { name: true } } },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async update(id: string, restaurantId: string, actorId: string, dto: any) {
    const existing = await this.findById(id, restaurantId);
    const data: any = { ...dto };
    if (dto.password) { data.passwordHash = await this.auth.hashPassword(dto.password); delete data.password; }
    const updated = await this.prisma.user.update({ where: { id }, data });
    await this.audit.log({ restaurantId, userId: actorId, action: 'USER_CHANGE', entityType: 'User', entityId: id, oldData: { role: existing.role, isActive: existing.isActive }, newData: { role: updated.role, isActive: updated.isActive } });
    const { passwordHash, ...safe } = updated as any;
    return safe;
  }

  async toggleActive(id: string, restaurantId: string, actorId: string, isActive: boolean) {
    await this.findById(id, restaurantId);
    const u = await this.prisma.user.update({ where: { id }, data: { isActive } });
    await this.audit.log({ restaurantId, userId: actorId, action: 'USER_CHANGE', entityType: 'User', entityId: id, newData: { isActive } });
    const { passwordHash, ...safe } = u as any;
    return safe;
  }
}
