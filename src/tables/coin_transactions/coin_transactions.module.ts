import { Module } from '@nestjs/common';
import { CoinTransactionsService } from './coin_transactions.service';
import { CoinTransactionsController } from './coin_transactions.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { CoinTransactions } from './coin_transactions.model';
import { User } from '../user/user.model';

import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [SequelizeModule.forFeature([CoinTransactions, User]), NotificationModule],
  controllers: [CoinTransactionsController],
  providers: [CoinTransactionsService],
  exports: [CoinTransactionsService],
})
export class CoinTransactionsModule {}
