import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Post() create(@Req() req: any, @CurrentUser() u: JwtPayload, @Body() dto: any) { return this.svc.create(req.tenantId, u.sub, dto); }

  @Get() list(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return this.svc.findAll(req.tenantId, +(page ?? 1), +(limit ?? 20), search);
  }

  @Get(':id') findOne(@Req() req: any, @Param('id') id: string) { return this.svc.findById(id, req.tenantId); }

  @Patch(':id') update(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() dto: any) { return this.svc.update(id, req.tenantId, u.sub, dto); }

  @Patch(':id/toggle') @HttpCode(HttpStatus.OK)
  toggle(@Req() req: any, @CurrentUser() u: JwtPayload, @Param('id') id: string, @Body() b: { isActive: boolean }) { return this.svc.toggleActive(id, req.tenantId, u.sub, b.isActive); }
}
