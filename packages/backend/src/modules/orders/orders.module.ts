import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DailyNumberService } from './daily-number.service';
import { AuditModule } from '../audit/audit.module';
import { CustomersModule } from '../customers/customers.module';
import { OwnersModule } from '../owners/owners.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [AuditModule, CustomersModule, OwnersModule, forwardRef(() => WhatsAppModule)],
  controllers: [OrdersController],
  providers: [OrdersService, DailyNumberService],
  exports: [OrdersService, DailyNumberService],
})
export class OrdersModule {}
