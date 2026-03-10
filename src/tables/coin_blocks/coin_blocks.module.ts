import { Module } from '@nestjs/common';
import { CoinBlocksService } from './coin_blocks.service';
import { CoinBlocksController } from './coin_blocks.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { CoinBlock } from './coin_blocks.model';
import { User } from '../user/user.model';
import { AuctionItems } from '../action-items/auction-items.model';
import { Class } from '../classes/classes.model';

@Module({
  imports: [SequelizeModule.forFeature([CoinBlock, User, AuctionItems, Class])],
  controllers: [CoinBlocksController],
  providers: [CoinBlocksService],
  exports: [CoinBlocksService],
})
export class CoinBlocksModule {}
