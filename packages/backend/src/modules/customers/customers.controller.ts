import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
@Controller('customers')
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get('search') @ApiOperation({ summary: 'Search customers - primary key is phone' })
  search(@Req() req: any, @Query() q: any) {
    return this.svc.search(req.tenantId, q.phone, q.fromDate, q.toDate, q.fromTime, q.toTime, q.paymentMethod, q.orderType, q.branchId, +(q.page ?? 1), +(q.limit ?? 20));
  }

  @Get('by-phone/:phone') byPhone(@Req() req: any, @Param('phone') phone: string) { return this.svc.findByPhone(req.tenantId, phone); }

  @Post('upsert') upsert(@Req() req: any, @Body() dto: any) { return this.svc.upsertByPhone(req.tenantId, dto); }

  @Get(':id/orders') orders(@Req() req: any, @Param('id') id: string, @Query('page') page?: string) { return this.svc.getOrders(req.tenantId, id, +(page ?? 1)); }
}
