import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/role.decorator';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Roles('admin', 'teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Post(':classId')
  async createOrUpdate(
    @Param('classId') classId: number,
    @Body() body: { data: any }
  ) {
    return await this.schedulesService.createOrUpdate(classId, body.data);
  }

  @UseGuards(AuthGuard)
  @Get(':classId')
  async findByClass(@Param('classId') classId: number) {
    const result = await this.schedulesService.findByClass(classId);
    return { data: result ? result.data : null };
  }

  @Roles('admin', 'teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Get()
  async findAll() {
    return await this.schedulesService.findAll();
  }
}
