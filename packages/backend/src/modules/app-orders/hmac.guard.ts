import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class HmacGuard implements CanActivate {
  private readonly logger = new Logger(HmacGuard.name);
  private readonly secret: string;
  private readonly isDev: boolean;

  constructor(private config: ConfigService) {
    this.secret = this.config.getOrThrow<string>('EXTERNAL_API_SECRET');
    this.isDev = this.config.get('NODE_ENV') !== 'production';
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const signature = req.headers['x-app-signature'] as string | undefined;

    if (this.isDev && req.headers['x-dev-bypass'] === 'true') {
      this.logger.warn('HMAC bypassed in development via X-Dev-Bypass');
      return true;
    }
    if (!signature) throw new UnauthorizedException('Missing X-App-Signature header');

    const rawBody = (req as any).rawBody;
    if (!rawBody) throw new UnauthorizedException('Raw body not captured');

    const expected = 'sha256=' + crypto.createHmac('sha256', this.secret).update(rawBody).digest('hex');
    try {
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid signature');
    }
    return true;
  }
}
