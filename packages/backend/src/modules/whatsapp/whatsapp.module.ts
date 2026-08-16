import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { MetaWhatsAppProvider } from './providers/meta-whatsapp.provider';

@Module({
  imports: [HttpModule],
  providers: [WhatsAppService, { provide: 'WHATSAPP_PROVIDER', useClass: MetaWhatsAppProvider }],
  controllers: [WhatsAppController],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
