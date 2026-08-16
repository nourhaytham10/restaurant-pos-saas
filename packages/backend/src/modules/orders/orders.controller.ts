import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Post() @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  @ApiOperation({ summary: 'Create order - atomic daily number, accounting, WhatsApp trigger' })
  create(@Req() req: any, @CurrentUser() u: JwtPayload, @Body() dto: any) { return this.svc.createOrder(req.tenantId, u.sub, dto, req.ip); }

  @Get() @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  list(@Req() req: any, @Query() f: any) { return this.svc.findAll(req.tenantId, f, req.allowedBranchIds); }

  @Get(':id') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  findOne(@Req() req: any, @Param('id') id: string) { return this.svc.findById(id, req.tenantId); }

  @Patch(':id') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  @ApiOperation({ summary: 'Edit order - ONLY when status IN_KITCHEN (enforced in backend)' })
  update(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: any) { return this.svc.updateOrder(id, req.tenantId, u.sub, dto); }

  @Patch(':id/status') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER) @HttpCode(HttpStatus.OK)
  status(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() b: { status: OrderStatus }) { return this.svc.updateStatus(id, req.tenantId, b.status, u.sub); }

  @Delete(':id') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR) @HttpCode(HttpStatus.OK)
  cancel(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() b: { reason?: string }) { return this.svc.cancelOrder(id, req.tenantId, u.sub, b?.reason); }
}
