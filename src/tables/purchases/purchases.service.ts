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
    const item = await this.shopItemModel.findByPk(createPurchaseDto.item_id);
    if (!item) {
      throw new BadRequestException(`XATO! Shop item topilmadi. Qidirilgan ID: ${createPurchaseDto.item_id}`);
    }
    
    // Postgres type bo'yicha ehtiyot bo'lish
    // is_active boolean 'false' yoki string 'false' bo'lishi mumkin
    if (item.is_active === false || item.is_active as any === 'false') {
       throw new BadRequestException('Ushbu mahsulot hozirda sotuvda mavjud emas (Nofaol).');
    }
    
    // Stock tekshirish (agar null bo'lmasa, demak cheklangan)
    if (item.stock !== null && item.stock !== undefined && item.stock <= 0) {
      throw new BadRequestException('Ushbu mahsulot zaxirada qolmagan (Tugagan).');
    }

    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new BadRequestException('Foydalanuvchi topilmadi.');
    }
    
    // Foydalanuvchida bor tangalar yetarlimi
    // Faqat user.coins ni tekshiramiz, chunki tarix (transactions) oldinroq bo'sh bo'lgan bo'lishi mumkin.
    const userCoins = user.coins || 0;
    
    if (userCoins < item.price_coins) {
      throw new BadRequestException(`Tangalaringiz yetarli emas! Sizda ${userCoins} ta, mahsulot narxi esa ${item.price_coins} ta.`);
    }

    // Tarixga xaridni yozib qoldiramiz 
    // Bu avtomat user_coins ni - (manfiy) narx miqdorida kamaytirishi coinTransactionsService ichida yozilgan!
    await this.coinTransactionsService.create({
      user_id: user.id,
      amount: -item.price_coins,
      type: 'purchase', // expense o'rniga aniqroq 'purchase' deyish yaxshiroq
      reason: `Do'kondan xarid: ${item.name}`,
    } as any);

    // Zaxira bor bo'lsa uni bittaga kamaytiramiz va agar tugasa, nofaol qilamiz
    if (item.stock !== null && item.stock !== undefined && item.stock > 0) {
      item.stock -= 1;
      if (item.stock <= 0) {
         item.is_active = false;
      }
      await item.save();
    } else {
      // Yagona (cheksiz ko'rsatilmagan ammo limit ham yo'q holat) - bunday maxsulotni faqat bir marta sotish mumkin bo'lsa,
      // lekin odatda null = cheksiz degani bo'ladi!
      // Agar 'stock' maxsus holda o'rnatilmagan bo'lsa (null), u cheksiz bo'ladi va is_active = false qilmasligimiz kerak!
      // Demak, hech narsa zaxiradan ayirmaymiz.
    }

    // Sotuvni yozib qo'ydik
    const purchase = await this.purchaseModel.create({
      user_id: user.id,
      item_id: item.id,
      price_paid: item.price_coins,
      status: 'pending' // Hozircha pending, o'qituvchi tasdiqlaydi
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
