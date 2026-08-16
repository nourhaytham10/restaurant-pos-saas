import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AppOrdersService } from './app-orders.service';
import { HmacGuard } from './hmac.guard';

@ApiTags('App Orders (Website / Mobile)')
@Controller('app-orders')
export class AppOrdersController {
  constructor(private svc: AppOrdersService) {}

  @Post('external')
  @UseGuards(HmacGuard)
  @ApiOperation({ summary: '[External] Create app order - HMAC signature required' })
  createExternal(@Body() dto: any) { return this.svc.createFromApp(dto); }

  @Get('pending')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard) @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  pending(@Req() req: any) { return this.svc.getPending(req.tenantId); }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard) @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  accept(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: any) { return this.svc.accept(id, req.tenantId, u.sub, dto.branchId ?? u.branchId ?? ''); }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard) @ApiBearerAuth()
  @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  reject(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: any) { return this.svc.reject(id, req.tenantId, u.sub, dto.rejectReason); }
}
