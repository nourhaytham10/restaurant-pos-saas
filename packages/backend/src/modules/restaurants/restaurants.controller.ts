import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RestaurantsService } from './restaurants.service';

@ApiTags('Restaurants (Super Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('super/restaurants')
export class RestaurantsController {
  constructor(private svc: RestaurantsService) {}

  @Post() @ApiOperation({ summary: 'Create restaurant tenant' })
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Get() list(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return this.svc.findAll(+(page ?? 1), +(limit ?? 20), search);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findById(id); }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }

  @Patch(':id/toggle') @HttpCode(HttpStatus.OK)
  toggle(@Param('id') id: string, @Body() b: { isActive: boolean }) { return this.svc.toggleActive(id, b.isActive); }
}
