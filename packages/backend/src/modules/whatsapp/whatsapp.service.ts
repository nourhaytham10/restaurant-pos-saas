import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppProvider } from './providers/whatsapp-provider.interface';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  constructor(private prisma: PrismaService, @Inject('WHATSAPP_PROVIDER') private provider: WhatsAppProvider) {}

  buildOrderMessage(order: any, restaurantName?: string): string {
    const items = (order.items ?? []).map((i: any) => `• ${i.productName}${i.sizeName ? ' (' + i.sizeName + ')' : ''} × ${i.quantity} = ${i.lineTotal.toFixed(2)} ج.م`).join('\n');
    return [
      `✅ تم استلام طلبك بنجاح`,
      `🍽️ ${restaurantName ?? 'المطعم'}`,
      `🔢 رقم الطلب: ${order.dailyNumber}`,
      `📋 الطلبات:`,
      items,
      order.discountAmount > 0 ? `🏷️ الخصم: ${order.discountAmount.toFixed(2)} ج.م` : null,
      order.deliveryFee > 0 ? `🚗 التوصيل: ${order.deliveryFee.toFixed(2)} ج.م` : null,
      `💰 الإجمالي: ${order.totalAmount.toFixed(2)} ج.م`,
      `⏱️ الوقت المتوقع للتجهيز: 45 دقيقة`,
      `شكرًا لطلبكم! 🙏`,
    ].filter(Boolean).join('\n');
  }

  async sendOrderConfirmation(order: any, restaurantId: string): Promise<void> {
    const phone = order.customerPhone;
    if (!phone) return;
    const rest = await this.prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { name: true } });
    const body = this.buildOrderMessage(order, rest?.name);
    const log = await this.prisma.whatsAppLog.create({ data: { restaurantId, orderId: order.id, phoneNumber: phone, messageBody: body, status: 'PENDING' } });

    if (!this.provider.isConfigured()) {
      await this.prisma.whatsAppLog.update({ where: { id: log.id }, data: { status: 'FAILED', errorMessage: 'WHATSAPP_NOT_CONFIGURED', sentAt: new Date() } });
      this.logger.warn('WhatsApp not configured - logged as FAILED');
      return;
    }
    try {
      const providerMsgId = await this.provider.sendText(phone, body);
      await this.prisma.whatsAppLog.update({ where: { id: log.id }, data: { status: 'SENT', providerMsgId, sentAt: new Date() } });
    } catch (err: any) {
      await this.prisma.whatsAppLog.update({ where: { id: log.id }, data: { status: 'FAILED', errorMessage: err.message, sentAt: new Date() } });
      this.logger.error(`WhatsApp failed for order ${order.id}: ${err.message}`);
    }
  }

  async sendInvoice(orderId: string, restaurantId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId }, include: { items: true } });
    if (!order) return { success: false, message: 'Order not found' };
    if (!order.customerPhone) return { success: false, message: 'No customer phone' };
    await this.sendOrderConfirmation(order, restaurantId);
    return { success: true, message: 'Invoice queued' };
  }

  getWaLink(phone: string, body: string): string {
    return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(body)}`;
  }
}
