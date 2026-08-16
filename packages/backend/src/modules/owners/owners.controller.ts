import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OwnersService } from './owners.service';

@ApiTags('Owners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('owners')
export class OwnersController {
  constructor(private svc: OwnersService) {}

  @Post() @Roles(Role.RESTAURANT_ADMIN)
  create(@Req() req: any, @Body() dto: any) { return this.svc.create(req.tenantId, dto); }

  @Get() @Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
  @ApiOperation({ summary: 'List active owners for POS dropdown' })
  list(@Req() req: any, @Query('branchId') branchId?: string, @Query('search') search?: string) { return this.svc.findAll(req.tenantId, branchId, search); }

  @Get(':id') @Roles(Role.RESTAURANT_ADMIN)
  findOne(@Req() req: any, @Param('id') id: string) { return this.svc.findById(id, req.tenantId); }

  @Patch(':id') @Roles(Role.RESTAURANT_ADMIN)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) { return this.svc.update(id, req.tenantId, dto); }
}
