import { Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN, Role.SUPERVISOR, Role.CASHIER)
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private svc: WhatsAppService, private prisma: PrismaService) {}

  @Post('send-invoice/:orderId')
  @ApiOperation({ summary: 'Send invoice via WhatsApp API' })
  sendInvoice(@Req() req: any, @Param('orderId') orderId: string) { return this.svc.sendInvoice(orderId, req.tenantId); }

  @Get('link/:orderId')
  @ApiOperation({ summary: 'Get wa.me link with pre-filled invoice' })
  async getLink(@Req() req: any, @Param('orderId') orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId: req.tenantId }, include: { items: true } });
    if (!order) return { error: 'Order not found' };
    if (!order.customerPhone) return { error: 'No customer phone' };
    return { url: this.svc.getWaLink(order.customerPhone, this.svc.buildOrderMessage(order)) };
  }
}
