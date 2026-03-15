import { Module } from '@nestjs/common';
import { AuctionLogsService } from './auction_logs.service';
import { AuctionLogsController } from './auction_logs.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuctionLog } from './auction_logs.model';
import { Auction } from '../auctions/auctions.model';
import { User } from '../user/user.model';

@Module({
  imports: [SequelizeModule.forFeature([AuctionLog, Auction, User])],
  controllers: [AuctionLogsController],
  providers: [AuctionLogsService],
})
export class AuctionLogsModule {}
