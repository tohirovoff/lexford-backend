// app.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { ShopItemsModule } from './tables/shop_items/shop_items.module';
import { ShopItem } from './tables/shop_items/shop_items.model';
import { PurchasesModule } from './tables/purchases/purchases.module';
import { Purchase } from './tables/purchases/purchases.model';
import { SchedulesModule } from './tables/schedules/schedules.module';
import { Schedule } from './tables/schedules/schedules.model';
import { NotificationModule } from './tables/notifications/notification.module';
import { Notification } from './tables/notifications/notification.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(configService.get<string>('DB_PORT') || '5432', 10),
        username: configService.get<string>('DB_USER') || 'postgres',
        password: configService.get<string>('DB_PASSWORD') || 'postgres',
        database: configService.get<string>('DB_NAME') || 'lexford_db',
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
          ShopItem,
          Purchase,
          Schedule,
          Notification,
        ],
      }),
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    UserModule,ClassesModule,AuctionsModule,ActionItemsModule,BidsModule,PenaltiesModule,AuctionLogsModule,CoinTransactionsModule,CoinBlocksModule,AttendanceModule,ShopItemsModule,PurchasesModule,SchedulesModule,NotificationModule,
  ],
})
export class AppModule {}
