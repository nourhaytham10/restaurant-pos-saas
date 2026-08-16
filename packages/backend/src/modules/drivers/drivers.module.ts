import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriverAssignService } from './driver-assign.service';
import { SettlementService } from './settlement.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DriversController],
  providers: [DriversService, DriverAssignService, SettlementService],
  exports: [DriversService, DriverAssignService, SettlementService],
})
export class DriversModule {}
