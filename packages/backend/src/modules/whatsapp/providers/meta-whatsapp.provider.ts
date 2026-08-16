import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WhatsAppProvider } from './whatsapp-provider.interface';

@Injectable()
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsAppProvider.name);
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService, private http: HttpService) {
    this.accessToken = this.config.get('WHATSAPP_ACCESS_TOKEN', '');
    this.phoneNumberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID', '');
    this.apiVersion = this.config.get('WHATSAPP_API_VERSION', 'v18.0');
    this.enabled = this.config.get('WHATSAPP_ENABLED', 'false') === 'true';
  }

  isConfigured(): boolean { return this.enabled && !!this.accessToken && !!this.phoneNumberId; }

  async sendText(to: string, body: string): Promise<string> {
    if (!this.isConfigured()) throw new Error('WHATSAPP_NOT_CONFIGURED');
    const phone = to.replace(/[^0-9]/g, '');
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    const response = await firstValueFrom(
      this.http.post(url, { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }, {
        headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      }),
    );
    const msgId = response.data?.messages?.[0]?.id;
    if (!msgId) throw new Error('WHATSAPP_SEND_FAILED');
    this.logger.log(`WhatsApp sent to ${phone}`);
    return msgId;
  }
}
