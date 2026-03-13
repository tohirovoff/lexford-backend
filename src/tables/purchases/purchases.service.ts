import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Purchase } from './purchases.model';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { User } from '../user/user.model';
import { ShopItem } from '../shop_items/shop_items.model';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Purchase)
    private purchaseModel: typeof Purchase,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(ShopItem)
    private shopItemModel: typeof ShopItem,
  ) {}

  async create(userId: number, createPurchaseDto: CreatePurchaseDto) {
    const item = await this.shopItemModel.findByPk(createPurchaseDto.item_id);
    if (!item) {
      throw new BadRequestException('Shop item not found');
    }
    if (!item.is_active) {
       throw new BadRequestException('Item is not active');
    }
    if (item.stock !== null && item.stock !== undefined && item.stock <= 0) {
      throw new BadRequestException('Item is out of stock');
    }

    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if ((user.coins || 0) < item.price_coins) {
      throw new BadRequestException('Not enough coins');
    }

    // Deduct coins
    user.coins = (user.coins || 0) - item.price_coins;
    await user.save();

    // Deduct stock
    if (item.stock !== null && item.stock !== undefined) {
      item.stock -= 1;
      await item.save();
    }

    const purchase = await this.purchaseModel.create({
      user_id: user.id,
      item_id: item.id,
      price_paid: item.price_coins,
    } as any);

    return purchase;
  }

  async findAll() {
    return this.purchaseModel.findAll({
      include: [
        { model: User, attributes: ['id', 'username', 'fullname', 'profile_picture'] },
        { model: ShopItem, as: 'item' }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async findByUser(userId: number) {
    return this.purchaseModel.findAll({
      where: { user_id: userId },
      include: [
        { model: ShopItem, as: 'item' }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async updateStatus(id: number, status: string) {
    const purchase = await this.purchaseModel.findByPk(id);
    if (!purchase) {
      throw new BadRequestException('Purchase not found');
    }
    purchase.status = status;
    return purchase.save();
  }

  async remove(id: number) {
    const purchase = await this.purchaseModel.findByPk(id);
    if (!purchase) {
      throw new BadRequestException('Purchase not found');
    }
    return purchase.destroy();
  }
}
