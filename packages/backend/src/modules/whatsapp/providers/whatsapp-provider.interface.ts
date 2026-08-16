export interface WhatsAppProvider {
  sendText(to: string, body: string): Promise<string>;
  isConfigured(): boolean;
}
