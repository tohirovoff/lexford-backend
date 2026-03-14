import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Purchase } from './purchases.model';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { User } from '../user/user.model';
import { ShopItem } from '../shop_items/shop_items.model';
import { CoinTransactionsService } from '../coin_transactions/coin_transactions.service';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Purchase)
    private purchaseModel: typeof Purchase,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(ShopItem)
    private shopItemModel: typeof ShopItem,
    private coinTransactionsService: CoinTransactionsService,
  ) {}

  async create(userId: number, createPurchaseDto: CreatePurchaseDto) {
    // 1. Mahsulotni topish
    const item = await this.shopItemModel.findByPk(createPurchaseDto.item_id, { raw: true });
    if (!item) {
      throw new BadRequestException(`XATO! Shop item topilmadi. Qidirilgan ID: ${createPurchaseDto.item_id}`);
    }
    
    // DEBUG: Bazadan kelgan ma'lumotlarni konsolga chiqarish
    console.log('DEBUG raw item:', JSON.stringify(item));

    // 2. Mahsulot faolmi tekshirish  
    if (item.is_active === false || (item.is_active as any) === 'false') {
       throw new BadRequestException('Ushbu mahsulot hozirda sotuvda mavjud emas (Nofaol).');
    }
    
    // 3. Stock (Zaxira) tekshirish
    if (item.stock !== null && item.stock !== undefined && item.stock <= 0) {
      throw new BadRequestException('Ushbu mahsulot zaxirada qolmagan (Tugagan).');
    }

    // 4. Foydalanuvchini topish
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi.');
    }

    // 5. Narx va nomni XAVFSIZ olish
    const itemPrice = Number(item.price_coins);
    const itemName = item.name || 'Nomsiz mahsulot';

    console.log(`DEBUG: itemPrice=${itemPrice}, itemName=${itemName}, userCoins=${user.coins}`);

    if (!itemPrice || isNaN(itemPrice) || itemPrice <= 0) {
      throw new BadRequestException(`Mahsulot narxi noto'g'ri: "${item.price_coins}". Iltimos, adminstratorga murojaat qiling.`);
    }

    // 6. Yetarli tangalar bormi tekshirish
    const userCoins = user.coins || 0;
    if (userCoins < itemPrice) {
      throw new BadRequestException(`Tangalaringiz yetarli emas! Sizda ${userCoins} ta, mahsulot narxi esa ${itemPrice} ta.`);
    }

    // 7. Coin tranzaksiyasi yaratish (tangalarni ayirish)
    await this.coinTransactionsService.create({
      user_id: user.id,
      amount: -itemPrice,
      type: 'purchase', 
      reason: `Do'kondan xarid: ${itemName}`,
      created_by: user.id
    } as any);

    // 8. Zaxirani kamaytirish (agar cheklangan bo'lsa)
    if (item.stock !== null && item.stock !== undefined && item.stock > 0) {
      // raw: true ishlatilgani uchun endi model instance kerak
      const itemInstance = await this.shopItemModel.findByPk(item.id);
      if (itemInstance) {
        itemInstance.stock = (itemInstance.stock || 0) - 1;
        if (itemInstance.stock <= 0) {
          itemInstance.is_active = false;
        }
        await itemInstance.save();
      }
    }

    // 9. Xaridni qayd etish
    const purchase = await this.purchaseModel.create({
      user_id: user.id,
      item_id: item.id,
      price_paid: itemPrice,
      status: 'pending'
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
