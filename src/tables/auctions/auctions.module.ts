import { Module } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Auction } from './auctions.model';
import { Penalties } from '../penalties/penalties.model';
import { AuctionLog } from '../auction_logs/auction_logs.model';
import { AuctionItems } from '../action-items/auction-items.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Auction, Penalties, AuctionLog, AuctionItems]),
  ],
  controllers: [AuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}
