import { Module } from '@nestjs/common';
import { ActionItemsService } from './action-items.service';
import { ActionItemsController } from './action-items.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuctionItems } from './auction-items.model';
import { Bids } from '../bids/bids.model';
import { Auction } from '../auctions/auctions.model';
import { User } from '../user/user.model';
import { CoinBlock } from '../coin_blocks/coin_blocks.model';

@Module({
  imports: [
    SequelizeModule.forFeature([AuctionItems, Bids, Auction, User, CoinBlock]),
  ],
  controllers: [ActionItemsController],
  providers: [ActionItemsService],
})
export class ActionItemsModule {}
