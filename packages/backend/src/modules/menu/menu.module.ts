import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { CategoriesService } from './categories.service';
import { ProductsService } from './products.service';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [AuditModule], controllers: [MenuController], providers: [CategoriesService, ProductsService], exports: [CategoriesService, ProductsService] })
export class MenuModule {}
