import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [MenuController] })
export class MenuModule {}
