import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { DriversService } from './drivers.service';
import { DriverAssignService } from './driver-assign.service';
import { SettlementService } from './settlement.service';

@ApiTags('Drivers & Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private driversSvc: DriversService, private assignSvc: DriverAssignService, private settlementSvc: SettlementService) {}

  @Post() @Roles(Role.RESTAURANT_ADMIN)
  create(@Req() req: any, @Body() dto: any) { return this.driversSvc.create(req.tenantId, dto); }

  @Get() @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  list(@Req() req: any, @Query('branchId') branchId?: string, @Query('activeOnly') a?: string) { return this.driversSvc.findAll(req.tenantId, branchId, a === 'true'); }

  @Get(':id') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
  findOne(@Req() req: any, @Param('id') id: string) { return this.driversSvc.findById(id, req.tenantId); }

  @Patch(':id') @Roles(Role.RESTAURANT_ADMIN)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) { return this.driversSvc.update(id, req.tenantId, dto); }

  @Get(':id/due') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Current unsettled due for driver' })
  due(@Req() req: any, @Param('id') id: string) { return this.driversSvc.getCurrentDue(id, req.tenantId); }

  @Post('assign/:orderId') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER) @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign driver - moves status to ON_THE_WAY' })
  assign(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('orderId') orderId: string, @Body() dto: { driverId: string }) {
    return this.assignSvc.assign(orderId, dto.driverId, req.tenantId, u.sub, u.branchId ?? req.branchId ?? '');
  }

  @Post('unassign/:orderId') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER) @HttpCode(HttpStatus.OK)
  unassign(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('orderId') orderId: string) { return this.assignSvc.unassign(orderId, req.tenantId, u.sub); }

  @Post('settlement') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Create settlement - each order settled only once' })
  settle(@Req() req: any, @CurrentUser() u: JwtPayload, @Body() dto: any) { return this.settlementSvc.create(req.tenantId, u.sub, dto.driverId, dto.orderIds, dto.paidAmount, dto.branchId, dto.notes); }

  @Get('settlement/:driverId') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
  settlements(@Req() req: any, @Param('driverId') driverId: string) { return this.settlementSvc.findByDriver(driverId, req.tenantId); }
}
