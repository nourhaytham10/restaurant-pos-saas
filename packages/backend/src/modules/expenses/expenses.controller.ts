import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
@Controller('expenses')
export class ExpensesController {
  constructor(private svc: ExpensesService) {}

  @Post() create(@Req() req: any, @CurrentUser() u: JwtPayload, @Body() dto: any) { return this.svc.create(req.tenantId, u.sub, dto); }

  @Get() list(@Req() req: any, @Query() f: any) { return this.svc.findAll(req.tenantId, f, req.allowedBranchIds); }

  @Patch(':id') update(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: any) { return this.svc.update(id, req.tenantId, u.sub, dto); }

  @Delete(':id') @HttpCode(HttpStatus.OK)
  remove(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string) { return this.svc.softDelete(id, req.tenantId, u.sub); }
}
