import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendancesService } from './attendance.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Attendance } from './attendance.model';
import { User } from '../user/user.model';
import { Class } from '../classes/classes.model';
import { CoinTransactionsModule } from '../coin_transactions/coin_transactions.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Attendance, Class, User]),
    CoinTransactionsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendancesService],
  exports: [AttendancesService],
})
export class AttendanceModule {}
