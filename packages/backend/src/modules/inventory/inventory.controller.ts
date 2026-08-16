import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
@Controller('inventory')
export class InventoryController {
  constructor(private svc: InventoryService) {}

  @Post('items') createItem(@Req() req: any, @Body() dto: any) { return this.svc.createItem(req.tenantId, dto); }

  @Get('items') listItems(@Req() req: any, @Query('branchId') branchId?: string, @Query('lowStock') lowStock?: string) { return this.svc.findAllItems(req.tenantId, branchId, lowStock === 'true'); }

  @Post('movements') @ApiOperation({ summary: 'Record stock movement - atomic quantity update' })
  move(@Req() req: any, @CurrentUser() u: JwtPayload, @Body() dto: any) { return this.svc.recordMovement(req.tenantId, u.sub, dto); }

  @Get('movements') movements(@Req() req: any, @Query('itemId') itemId?: string) { return this.svc.getMovements(req.tenantId, itemId); }

  @Post('purchases') @ApiOperation({ summary: 'Record purchase - atomic stock-in' })
  purchase(@Req() req: any, @CurrentUser() u: JwtPayload, @Body() dto: any) { return this.svc.createPurchase(req.tenantId, u.sub, dto); }
}
