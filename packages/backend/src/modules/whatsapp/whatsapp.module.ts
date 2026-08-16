import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { MetaWhatsAppProvider } from './providers/meta-whatsapp.provider';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [HttpModule, OrdersModule],
  providers: [WhatsAppService, { provide: 'WHATSAPP_PROVIDER', useClass: MetaWhatsAppProvider }],
  controllers: [WhatsAppController],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
