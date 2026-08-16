import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OwnersModule } from './modules/owners/owners.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AppOrdersModule } from './modules/app-orders/app-orders.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { AuditModule } from './modules/audit/audit.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule, AuthModule,
    RestaurantsModule, BranchesModule, UsersModule, CustomersModule, OwnersModule,
    MenuModule, OrdersModule, DriversModule, InventoryModule, ExpensesModule,
    SessionsModule, ReportsModule, AppOrdersModule, WhatsAppModule, AuditModule,
    GatewayModule,
  ],
})
export class AppModule {}
