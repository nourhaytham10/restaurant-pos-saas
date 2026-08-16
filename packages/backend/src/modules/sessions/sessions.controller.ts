import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { SessionsService } from './sessions.service';

@ApiTags('Cashier Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private svc: SessionsService) {}

  @Post('open') @Roles(Role.CASHIER, Role.SUPERVISOR, Role.RESTAURANT_ADMIN)
  open(@Req() req: any, @CurrentUser() u: JwtPayload, @Body() dto: any) { return this.svc.open(req.tenantId, u.sub, dto); }

  @Get('active') @Roles(Role.CASHIER, Role.SUPERVISOR, Role.RESTAURANT_ADMIN)
  active(@CurrentUser() u: JwtPayload) { return this.svc.getActive(u.sub); }

  @Get() @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
  list(@Req() req: any, @Query('branchId') branchId?: string, @Query('status') status?: string) { return this.svc.findAll(req.tenantId, branchId, status); }

  @Get(':id') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
  findOne(@Req() req: any, @Param('id') id: string) { return this.svc.findById(id, req.tenantId); }

  @Patch(':id/close') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR) @HttpCode(HttpStatus.OK)
  close(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: any) { return this.svc.close(id, req.tenantId, u.sub, dto); }
}
