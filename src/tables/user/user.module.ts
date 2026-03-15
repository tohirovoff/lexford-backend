import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './user.model';
import { SharingModule } from 'src/common/sharingModule';
import { AuthModule } from 'src/common/auth/auth.module';
import { AuthService } from 'src/common/auth/auth.service';
import { Penalties } from '../penalties/penalties.model';
import { Bids } from '../bids/bids.model';
import { AuctionItems } from '../action-items/auction-items.model';
import { CoinTransactions } from '../coin_transactions/coin_transactions.model';
import { CoinBlock } from '../coin_blocks/coin_blocks.model';
import { AuctionLog } from '../auction_logs/auction_logs.model';
import { Class } from '../classes/classes.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      User, 
      Penalties, 
      Bids, 
      AuctionItems, 
      CoinTransactions, 
      CoinBlock, 
      AuctionLog, 
      Class
    ]),
    SharingModule,
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService, AuthService],
})
export class UserModule {}
