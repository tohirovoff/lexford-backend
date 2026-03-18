// src/coin-transactions/coin-transactions.service.ts
// (papka nomini ham coin-transactions deb qoldirdik, lekin model singular)

import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User } from '../user/user.model';
import { CoinTransactions } from './coin_transactions.model';
import { CreateCoinTransactionDto } from './dto/create-coin_transaction.dto';
import { UpdateCoinTransactionDto } from './dto/update-coin_transaction.dto';
import { Transaction } from 'sequelize';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class CoinTransactionsService {
  constructor(
    @InjectModel(CoinTransactions)
    private readonly coinTransactionModel: typeof CoinTransactions,
    @InjectModel(User)
    private readonly userModel: typeof User,
    private readonly notificationService: NotificationService,
  ) {}

  // Har doim ishlatiladigan include — receiver va giver bilan
  private getIncludes() {
    return [
      { model: User, as: 'receiver' }, // kim coin olgan
      { model: User, as: 'giver' }, // kim coin bergan (admin/teacher yoki null)
    ];
  }

  // Yangi tranzaksiya yaratish
  async create(dto: CreateCoinTransactionDto, t?: Transaction) {
    try {
      // Miqdorni aniq butun son (integer) ekanligiga ishonch hosil qilamiz
      const amount = Math.trunc(Number(dto.amount));

      // Maksimal 10 tanga berish cheklovi (faqat reward uchun)
      if (dto.type === 'reward' && amount > 10) {
        throw new HttpException(
          'Maksimal 10 tanga berish mumkin',
          HttpStatus.BAD_REQUEST,
        );
      }

      const transaction = await this.coinTransactionModel.create(
        dto as any,
        { transaction: t }
      );

      // User.coins maydonini atomic (xavfsiz) yangilash – race condition va ma'lumot yo'qolishini oldini olish uchun
      const user = await this.userModel.findByPk(dto.user_id, { transaction: t });
      if (user) {
        // Musbat yoki manfiy bo'lishidan qat'i nazar increment ishlatamiz (decrement -X bilan teng)
        await user.increment('coins', {
          by: amount,
          transaction: t,
        });

        // Yangilangan qiymatni logda ko'rish uchun reload qilamiz
        await user.reload({ transaction: t });
        console.log(
          `DEBUG coins updated: userId=${dto.user_id}, change=${amount}, newBalance=${user.getDataValue('coins')}`,
        );

        // Xabarnoma yuborish
        const isPenalty = dto.type === 'penalty' || dto.amount < 0;
        let title = isPenalty ? 'Jarima' : 'Tangalar qabul qilindi';
        let message = isPenalty
          ? `${Math.abs(dto.amount)} tanga miqdorida jarima qo'llanildi. Sabab: ${dto.reason || 'belgilanmagan'}`
          : `${dto.amount} ta tanga hisobingizga qo'shildi. Sabab: ${dto.reason || 'belgilanmagan'}`;
        let type = isPenalty ? 'penalty' : 'reward';

        if (dto.type === 'bid_refund') {
          title = 'Stavka qaytarildi';
          message = `Sizning stavkangizdan yuqori stavka qo'yildi. ${dto.amount} ta tanga hisobingizga qaytarildi.`;
          type = 'auction';
        } else if (dto.type === 'bid_block') {
          title = 'Stavka qo\'yildi';
          message = `${Math.abs(dto.amount)} ta tanga stavka uchun bloklandi.`;
          type = 'auction';
        }

        await this.notificationService.create({
          user_id: dto.user_id,
          title,
          message,
          type,
        });
      }

      return transaction;
    } catch (error) {
      console.error('Tranzaksiya yaratishdagi asil xato:', error);
      throw new HttpException(
        error.message || 'Coin tranzaksiyasi yaratishda xatolik yuz berdi',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bir nechta tranzaksiya qo'shish (bulk)
  async createMany(dtos: CreateCoinTransactionDto[]) {
    const sequelize = this.coinTransactionModel.sequelize;
    if (!sequelize) {
      throw new HttpException(
        'Sequelize instance topilmadi',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const t = await sequelize.transaction();

    try {
      const results: any[] = [];
      for (const dto of dtos) {
        const result = await this.create(dto, t);
        results.push(result);
      }
      await t.commit();
      return results;
    } catch (error) {
      await t.rollback();
      console.error('Bulk create error:', error);
      throw new HttpException(
        error.message || 'Bir nechta tranzaksiya qo‘shishda xatolik',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha tranzaksiyalarni olish (admin uchun)
  async findAll() {
    return this.coinTransactionModel.findAll({
      include: this.getIncludes(),
      order: [['createdAt', 'DESC']],
    });
  }

  // Bitta tranzaksiyani ID bo‘yicha olish
  async findOne(id: number) {
    const transaction = await this.coinTransactionModel.findByPk(id, {
      include: this.getIncludes(),
    });

    if (!transaction) {
      throw new NotFoundException(`ID: ${id} bo‘lgan tranzaksiya topilmadi`);
    }

    return transaction;
  }

  // Yangilash (masalan, reason yoki type ni tuzatish uchun)
  async update(id: number, dto: UpdateCoinTransactionDto) {
    const [updatedCount] = await this.coinTransactionModel.update(dto, {
      where: { id },
    });

    if (updatedCount === 0) {
      throw new NotFoundException(`ID: ${id} bo‘lgan tranzaksiya topilmadi`);
    }

    return this.findOne(id);
  }

  // O‘chirish (ehtiyot bo‘ling – tarixni saqlash muhim!)
  async remove(id: number) {
    const deleted = await this.coinTransactionModel.destroy({ where: { id } });

    if (deleted === 0) {
      throw new NotFoundException(`ID: ${id} bo‘lgan tranzaksiya topilmadi`);
    }

    return { message: 'Tranzaksiya muvaffaqiyatli o‘chirildi' };
  }

  // Foydalanuvchi bo‘yicha tranzaksiyalarni olish (faqat o'ziga tegishli!)
  async findByUserId(user_id: number) {
    const transactions = await this.coinTransactionModel.findAll({
      where: {
        [Op.or]: [{ user_id }, { created_by: user_id }],
      },
      include: this.getIncludes(),
      order: [['createdAt', 'DESC']],
    });

    // Agar tranzaksiya bo'lmasa, bo'sh array qaytarish yetarli (404 emas)
    return transactions;
  }

  // Tur bo‘yicha tranzaksiyalarni olish (reward, penalty, auction_spent va h.k.)
  async findByType(type: string) {
    return this.coinTransactionModel.findAll({
      where: { type },
      include: this.getIncludes(),
      order: [['createdAt', 'DESC']],
    });
  }

  // Foydalanuvchining joriy coin balansini hisoblash (eng muhimi!)
  async getUserBalance(user_id: number): Promise<number> {
    const result = await this.coinTransactionModel.findOne({
      attributes: [
        [
          this.coinTransactionModel.sequelize!.fn(
            'COALESCE', // null bo‘lsa 0 qaytarsin
            this.coinTransactionModel.sequelize!.fn(
              'SUM',
              this.coinTransactionModel.sequelize!.col('amount'),
            ),
            0,
          ),
          'balance',
        ],
      ],
      where: { user_id },
      raw: true,
    });

    return parseInt((result as any)?.balance || '0', 10);
  }

  // User balance'ni tranzaksiyalar asosida to'g'rilash (recovery tool)
  async syncUserBalance(user_id: number) {
    const balance = await this.getUserBalance(user_id);
    await this.userModel.update({ coins: balance }, { where: { id: user_id } });
    return balance;
  }

  // === YANGI: Foydalanuvchining haftalik o'zgarishi (foizda) ===
  async getWeeklyChange(user_id: number) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Shu hafta ichidagi barcha tranzaksiyalar summasi
    const result = await this.coinTransactionModel.findOne({
      attributes: [
        [
          this.coinTransactionModel.sequelize!.fn(
            'COALESCE',
            this.coinTransactionModel.sequelize!.fn(
              'SUM',
              this.coinTransactionModel.sequelize!.col('amount'),
            ),
            0,
          ),
          'weekly_sum',
        ],
      ],
      where: {
        user_id,
        createdAt: { [Op.gte]: oneWeekAgo },
      },
      raw: true,
    });

    const weeklyChange = parseInt((result as any)?.weekly_sum || '0', 10);

    // Hozirgi balans
    const user = await this.userModel.findByPk(user_id, {
      attributes: ['id', 'coins', 'fullname', 'username'],
    });
    const currentCoins = user?.coins || 0;

    // O'tgan haftadagi balans (hozirgi - haftalik o'zgarish)
    const previousBalance = currentCoins - weeklyChange;

    // Foiz hisoblanishi
    let percentageChange = 0;
    if (previousBalance > 0) {
      percentageChange = Math.round((weeklyChange / previousBalance) * 100);
    } else if (weeklyChange > 0) {
      percentageChange = 100; // Noldan o'sdi
    }

    return {
      user_id,
      current_coins: currentCoins,
      weekly_change: weeklyChange,
      previous_balance: previousBalance,
      percentage_change: percentageChange,
      period_start: oneWeekAgo.toISOString(),
      period_end: now.toISOString(),
    };
  }

  // === YANGI: Haftalik top 10 tanga ko'paygan talabalar ===
  async getWeeklyTopGainers(limit: number = 10) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Shu hafta ichida eng ko'p tanga olgan studentlar
    const results = await this.coinTransactionModel.findAll({
      attributes: [
        'user_id',
        [
          this.coinTransactionModel.sequelize!.fn(
            'SUM',
            this.coinTransactionModel.sequelize!.col('amount'),
          ),
          'weekly_earned',
        ],
      ],
      where: {
        createdAt: { [Op.gte]: oneWeekAgo },
      },
      include: [
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'fullname', 'username', 'coins', 'profile_picture', 'class_id'],
          where: { role: 'student' },
          required: true,
        },
      ],
      group: ['user_id', 'receiver.id'],
      order: [[this.coinTransactionModel.sequelize!.literal('weekly_earned'), 'DESC']],
      limit,
      subQuery: false,
    });

    return results.map((item: any, index: number) => {
      const data = item.get({ plain: true });
      const weeklyEarned = Number(data.weekly_earned || 0);
      const currentCoins = data.receiver?.coins || 0;
      const previousBalance = currentCoins - weeklyEarned;
      const percentageChange = previousBalance > 0
        ? Math.round((weeklyEarned / previousBalance) * 100)
        : weeklyEarned > 0 ? 100 : 0;

      return {
        rank: index + 1,
        user_id: data.user_id,
        fullname: data.receiver?.fullname || data.receiver?.username || 'Noma\'lum',
        username: data.receiver?.username,
        profile_picture: data.receiver?.profile_picture,
        current_coins: currentCoins,
        weekly_earned: weeklyEarned,
        percentage_change: percentageChange,
        class_id: data.receiver?.class_id,
      };
    });
  }
}
