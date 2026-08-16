import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [AuditModule], controllers: [SessionsController], providers: [SessionsService], exports: [SessionsService] })
export class SessionsModule {}
