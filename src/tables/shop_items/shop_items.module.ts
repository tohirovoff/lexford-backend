import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ShopItemsController } from './shop_items.controller';
import { ShopItemsService } from './shop_items.service';
import { ShopItem } from './shop_items.model';

@Module({
  imports: [SequelizeModule.forFeature([ShopItem])],
  controllers: [ShopItemsController],
  providers: [ShopItemsService],
  exports: [ShopItemsService],
})
export class ShopItemsModule {}
