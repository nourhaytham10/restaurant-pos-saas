import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Controller('menu')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MenuController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async menu(@Req() req: any) {
    const tenantId = req.tenantId;
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({ where: { restaurantId: tenantId, isActive: true }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.product.findMany({ where: { restaurantId: tenantId, isActive: true }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    ]);
    return { categories, products };
  }
}
