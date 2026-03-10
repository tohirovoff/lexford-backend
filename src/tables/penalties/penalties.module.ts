import { Module } from '@nestjs/common';
import { PenaltiesService } from './penalties.service';
import { PenaltiesController } from './penalties.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Penalties } from './penalties.model';
import { Auction } from '../auctions/auctions.model';
import { User } from '../user/user.model';
import { CoinTransactionsModule } from '../coin_transactions/coin_transactions.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Penalties, Auction, User]),
    CoinTransactionsModule,
  ],
  controllers: [PenaltiesController],
  providers: [PenaltiesService],
})
export class PenaltiesModule {}
