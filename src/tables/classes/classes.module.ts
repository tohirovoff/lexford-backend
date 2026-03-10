import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Class } from './classes.model';
import { User } from '../user/user.model';
import { Attendance } from '../attendance/attendance.model';
import { CoinBlock } from '../coin_blocks/coin_blocks.model';

@Module({
  imports: [SequelizeModule.forFeature([Class, User, Attendance, CoinBlock])],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
