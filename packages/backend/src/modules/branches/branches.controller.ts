import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { BranchesService } from './branches.service';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private svc: BranchesService) {}

  @Post() @Roles(Role.RESTAURANT_ADMIN)
  create(@Req() req: any, @Body() dto: any) { return this.svc.create(req.tenantId, dto); }

  @Get() @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  list(@Req() req: any, @CurrentUser() u: JwtPayload) { return this.svc.findAll(req.tenantId, u.sub, u.role, req.allowedBranchIds); }

  @Get(':id') @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
  findOne(@Req() req: any, @Param('id') id: string) { return this.svc.findById(id, req.tenantId); }

  @Patch(':id') @Roles(Role.RESTAURANT_ADMIN)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) { return this.svc.update(id, req.tenantId, dto); }

  @Patch(':id/toggle') @Roles(Role.RESTAURANT_ADMIN) @HttpCode(HttpStatus.OK)
  toggle(@Req() req: any, @Param('id') id: string, @Body() b: { isActive: boolean }) { return this.svc.toggleActive(id, req.tenantId, b.isActive); }
}
