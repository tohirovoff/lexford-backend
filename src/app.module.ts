// app.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UserModule } from './tables/user/user.module';
import { User } from './tables/user/user.model';
import { ClassesModule } from './tables/classes/classes.module';
import { AuctionsModule } from './tables/auctions/auctions.module';
import { ActionItemsModule } from './tables/action-items/action-items.module';
import { BidsModule } from './tables/bids/bids.module';
import { PenaltiesModule } from './tables/penalties/penalties.module';
import { AuctionLogsModule } from './tables/auction_logs/auction_logs.module';
import { CoinTransactionsModule } from './tables/coin_transactions/coin_transactions.module';
import { CoinBlocksModule } from './tables/coin_blocks/coin_blocks.module';
import { Penalties } from './tables/penalties/penalties.model';
import { Auction } from './tables/auctions/auctions.model';
import { AuctionItems } from './tables/action-items/auction-items.model';
import { Bids } from './tables/bids/bids.model';
import { CoinTransactions } from './tables/coin_transactions/coin_transactions.model';
import { CoinBlock } from './tables/coin_blocks/coin_blocks.model';
import { AuctionLog } from './tables/auction_logs/auction_logs.model';
import { Class } from './tables/classes/classes.model';
import { AttendanceModule } from './tables/attendance/attendance.module';
import { Attendance } from './tables/attendance/attendance.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'lexford',
      username: 'postgres',
      password: '123456',
      autoLoadModels: true,
      synchronize: true, // development uchun, productionda false qiling!
      sync: { alter: true }, // Mavjud ma'lumotlarni saqlagan holda strukturani yangilash
      models: [
        User,
        Penalties,
        Auction,
        AuctionItems,
        Bids,
        CoinTransactions,
        CoinBlock,
        AuctionLog,
        Class,
        Attendance,
      ],
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads', // /static emas, /uploads yaxshiroq
    }),

    UserModule,

    ClassesModule,

    AuctionsModule,

    ActionItemsModule,

    BidsModule,

    PenaltiesModule,

    AuctionLogsModule,

    CoinTransactionsModule,

    CoinBlocksModule,

    AttendanceModule,
  ],
})
export class AppModule {}
