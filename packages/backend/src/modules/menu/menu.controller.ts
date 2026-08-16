import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CategoriesService } from './categories.service';
import { ProductsService } from './products.service';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('menu')
export class MenuController {
  constructor(private catSvc: CategoriesService, private prodSvc: ProductsService) {}

  @Get('pos') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  @ApiOperation({ summary: 'Full menu for POS' })
  posMenu(@Req() req: any) { return this.prodSvc.getMenuForPOS(req.tenantId); }

  @Post('categories') @Roles(Role.RESTAURANT_ADMIN)
  createCat(@Req() req: any, @Body() dto: any) { return this.catSvc.create(req.tenantId, dto); }

  @Get('categories') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  listCat(@Req() req: any, @Query('activeOnly') a?: string) { return this.catSvc.findAll(req.tenantId, a === 'true'); }

  @Patch('categories/:id') @Roles(Role.RESTAURANT_ADMIN)
  updateCat(@Req() req: any, @Param('id') id: string, @Body() dto: any) { return this.catSvc.update(id, req.tenantId, dto); }

  @Post('products') @Roles(Role.RESTAURANT_ADMIN)
  createProd(@Req() req: any, @CurrentUser() u: JwtPayload, @Body() dto: any) { return this.prodSvc.create(req.tenantId, u.sub, dto); }

  @Get('products') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  listProd(@Req() req: any, @Query('categoryId') catId?: string, @Query('activeOnly') a?: string) { return this.prodSvc.findAll(req.tenantId, catId, a === 'true'); }

  @Get('products/:id') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
  getProd(@Req() req: any, @Param('id') id: string) { return this.prodSvc.findById(id, req.tenantId); }

  @Patch('products/:id') @Roles(Role.RESTAURANT_ADMIN)
  updateProd(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: any) { return this.prodSvc.update(id, req.tenantId, u.sub, dto); }
}
