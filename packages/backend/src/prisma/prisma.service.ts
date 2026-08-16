import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); console.log('Prisma connected to PostgreSQL'); }
  async onModuleDestroy() { await this.$disconnect(); }
  async tx<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn, { maxWait: 5000, timeout: 10000, isolationLevel: 'Serializable' });
  }
}
