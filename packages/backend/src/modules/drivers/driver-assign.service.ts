import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DriverAssignService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async assign(orderId: string, driverId: string, restaurantId: string, actorId: string, branchId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'CANCELLED') throw new BadRequestException('Cannot assign to cancelled order');
    if (order.status === 'COMPLETED') throw new BadRequestException('Order already completed');

    const driver = await this.prisma.driver.findFirst({ where: { id: driverId, restaurantId, isActive: true } });
    if (!driver) throw new NotFoundException('Driver not found or inactive');

    await this.prisma.driverAssignment.updateMany({
      where: { orderId, isActive: true },
      data: { isActive: false, removedAt: new Date(), removedBy: actorId },
    });

    const assignment = await this.prisma.driverAssignment.upsert({
      where: { orderId },
      create: { orderId, driverId, branchId, assignedBy: actorId },
      update: { driverId, isActive: true, assignedAt: new Date(), removedAt: null, removedBy: null },
    });

    await this.prisma.order.update({ where: { id: orderId }, data: { status: 'ON_THE_WAY' } });

    await this.audit.log({ restaurantId, userId: actorId, action: 'ASSIGN_DRIVER', entityType: 'Order', entityId: orderId, newData: { driverId, driverName: driver.name } });
    return assignment;
  }

  async unassign(orderId: string, restaurantId: string, actorId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException('Order not found');
    const assignment = await this.prisma.driverAssignment.findFirst({ where: { orderId, isActive: true } });
    if (!assignment) throw new BadRequestException('No active driver assignment');

    await this.prisma.driverAssignment.update({ where: { id: assignment.id }, data: { isActive: false, removedAt: new Date(), removedBy: actorId } });
    await this.prisma.order.update({ where: { id: orderId }, data: { status: 'IN_KITCHEN' } });

    await this.audit.log({ restaurantId, userId: actorId, action: 'REMOVE_DRIVER', entityType: 'Order', entityId: orderId, oldData: { driverId: assignment.driverId } });
    return { success: true };
  }
}
