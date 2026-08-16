import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR)
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('financial') financial(@Req() req: any, @Query() f: any) { return this.svc.getFinancialSummary(req.tenantId, { ...f, allowedBranchIds: req.allowedBranchIds }); }
  @Get('products') products(@Req() req: any, @Query() f: any) { return this.svc.getProductAnalysis(req.tenantId, { ...f, allowedBranchIds: req.allowedBranchIds }); }
  @Get('sales-over-time') salesOverTime(@Req() req: any, @Query() f: any) { return this.svc.getSalesOverTime(req.tenantId, { ...f, allowedBranchIds: req.allowedBranchIds }); }
  @Get('by-branch') byBranch(@Req() req: any, @Query() f: any) { return this.svc.getSalesByBranch(req.tenantId, { ...f, allowedBranchIds: req.allowedBranchIds }); }
  @Get('by-payment') byPayment(@Req() req: any, @Query() f: any) { return this.svc.getSalesByPaymentMethod(req.tenantId, { ...f, allowedBranchIds: req.allowedBranchIds }); }
  @Get('driver-activity') driverActivity(@Req() req: any, @Query() f: any) { return this.svc.getDriverActivity(req.tenantId, { ...f, allowedBranchIds: req.allowedBranchIds }); }
}
