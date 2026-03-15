import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Schedule } from './schedules.model';
import { Class } from '../classes/classes.model';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { AuthModule } from '../../common/auth/auth.module';
import { SharingModule } from '../../common/sharingModule';

@Module({
  imports: [
    SequelizeModule.forFeature([Schedule, Class]),
    AuthModule,
    SharingModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
