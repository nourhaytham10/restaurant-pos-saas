import { Injectable } from '@nestjs/common';

/**
 * Atomic daily order number per branch.
 * UNIQUE(branchId, orderDate) on DailyOrderCounter prevents duplicates.
 * UNIQUE(branchId, orderDate, dailyNumber) on Order enforces at DB level.
 * Timezone: Africa/Cairo (UTC+2).
 */
@Injectable()
export class DailyNumberService {
  getCairoDate(): Date {
    const now = new Date();
    const cairo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return new Date(Date.UTC(cairo.getUTCFullYear(), cairo.getUTCMonth(), cairo.getUTCDate()));
  }

  async nextDailyNumber(tx: any, branchId: string): Promise<{ dailyNumber: number; orderDate: Date }> {
    const orderDate = this.getCairoDate();
    const counter = await tx.dailyOrderCounter.upsert({
      where: { branchId_orderDate: { branchId, orderDate } },
      create: { branchId, orderDate, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return { dailyNumber: counter.lastNumber, orderDate };
  }
}
