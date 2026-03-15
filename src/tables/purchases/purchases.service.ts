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

    // 4. Foydalanuvchini topish (raw: true — Sequelize class field shadowing muammosini oldini olish)
    const user = await this.userModel.findByPk(userId, { raw: true });
    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi.');
    }

    // 5. Narx va nomni XAVFSIZ olish
    const itemPrice = Number(item.price_coins);
    const itemName = item.name || 'Nomsiz mahsulot';
    const userCoins = Number(user.coins) || 0;

    console.log(`DEBUG: itemPrice=${itemPrice}, itemName=${itemName}, userCoins=${userCoins}, userId=${user.id}`);

    if (!itemPrice || isNaN(itemPrice) || itemPrice <= 0) {
      throw new BadRequestException(`Mahsulot narxi noto'g'ri: "${item.price_coins}". Iltimos, adminstratorga murojaat qiling.`);
    }

    // 6. Yetarli tangalar bormi tekshirish
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
    const purchase = await this.purchaseModel.findByPk(id, {
      include: [{ model: ShopItem, as: 'item' }]
    });
    if (!purchase) {
      throw new BadRequestException('Purchase not found');
    }

    const oldStatus = purchase.status;

    // Agar hozir 'cancelled' bo'lsa va oldin 'cancelled' bo'lmagan bo'lsa - tangalarni qaytarish kerak
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const itemName = purchase.item?.name || 'Mahsulot';
      await this.coinTransactionsService.create({
        user_id: purchase.user_id,
        amount: purchase.price_paid, // Musbat son - tangalar qaytadi
        type: 'refund',
        reason: `Bekor qilingan xarid uchun qaytarildi: ${itemName}`,
        created_by: purchase.user_id 
      } as any);

      // Agar bekor bo'lsa, stockni qaytarib qo'shish kerak (agar stock cheklangan bo'lsa)
      if (purchase.item_id) {
         const item = await this.shopItemModel.findByPk(purchase.item_id);
         if (item && item.stock !== null) {
            item.stock = (item.stock || 0) + 1;
            item.is_active = true; // Yana sotuvga chiqarish
            await item.save();
         }
      }
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
