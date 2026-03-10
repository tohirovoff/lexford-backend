import { Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Bids } from './bids.model';
import { AuctionItems } from '../action-items/auction-items.model';
import { User } from '../user/user.model';

import { CoinTransactionsModule } from '../coin_transactions/coin_transactions.module';
import { CoinBlocksModule } from '../coin_blocks/coin_blocks.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Bids, AuctionItems, User]),
    CoinTransactionsModule,
    CoinBlocksModule,
  ],
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}
