import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { Purchase } from './purchases.model';
import { User } from '../user/user.model';
import { ShopItem } from '../shop_items/shop_items.model';

@Module({
  imports: [SequelizeModule.forFeature([Purchase, User, ShopItem])],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
