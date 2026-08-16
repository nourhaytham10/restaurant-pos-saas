import { Module } from '@nestjs/common';
import { AppOrdersController } from './app-orders.controller';
import { AppOrdersService } from './app-orders.service';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';
import { CustomersModule } from '../customers/customers.module';
import { GatewayModule } from '../../gateway/gateway.module';

@Module({
  imports: [AuditModule, OrdersModule, CustomersModule, GatewayModule],
  controllers: [AppOrdersController],
  providers: [AppOrdersService],
  exports: [AppOrdersService],
})
export class AppOrdersModule {}
