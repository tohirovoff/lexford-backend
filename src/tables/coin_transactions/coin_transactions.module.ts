import { Module } from '@nestjs/common';
import { CoinTransactionsService } from './coin_transactions.service';
import { CoinTransactionsController } from './coin_transactions.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { CoinTransactions } from './coin_transactions.model';
import { User } from '../user/user.model';

@Module({
  imports: [SequelizeModule.forFeature([CoinTransactions, User])],
  controllers: [CoinTransactionsController],
  providers: [CoinTransactionsService],
  exports: [CoinTransactionsService],
})
export class CoinTransactionsModule {}
