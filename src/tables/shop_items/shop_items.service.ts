import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ShopItem } from './shop_items.model';
import { CreateShopItemDto } from './dto/create-shop-item.dto';
import { UpdateShopItemDto } from './dto/update-shop-item.dto';
import { Purchase } from '../purchases/purchases.model';

@Injectable()
export class ShopItemsService {
  constructor(
    @InjectModel(ShopItem)
    private shopItemModel: typeof ShopItem,
  ) {}

  async create(createShopItemDto: CreateShopItemDto): Promise<ShopItem> {
    return this.shopItemModel.create(createShopItemDto as any);
  }

  async findAll(): Promise<ShopItem[]> {
    return this.shopItemModel.findAll({
      order: [['createdAt', 'DESC']],
    });
  }

  async findActive(): Promise<ShopItem[]> {
    return this.shopItemModel.findAll({
      where: { is_active: true },
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: number): Promise<ShopItem> {
    const item = await this.shopItemModel.findByPk(id);
    if (!item) {
      throw new NotFoundException(`ShopItem with id ${id} not found`);
    }
    return item;
  }

  async update(id: number, updateShopItemDto: UpdateShopItemDto): Promise<ShopItem> {
    const item = await this.findOne(id);
    await item.update(updateShopItemDto);
    return item;
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await item.destroy();
  }
}
