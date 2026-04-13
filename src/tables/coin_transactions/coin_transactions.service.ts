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

      let status = 'approved';
      if (dto.type === 'reward') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Bugun shu o'qituvchi aynan shu o'quvchiga jami qancha tanga berganligini hisoblash
        const todayTotalObj = await this.coinTransactionModel.findOne({
          attributes: [
            [
              this.coinTransactionModel.sequelize!.fn(
                'SUM',
                this.coinTransactionModel.sequelize!.col('amount'),
              ),
              'total_today',
            ],
          ],
          where: {
            user_id: dto.user_id,
            created_by: dto.created_by,
            type: 'reward',
            createdAt: { [Op.gte]: today },
          } as any,
          raw: true,
          transaction: t,
        });

        const todayTotal = todayTotalObj ? Number((todayTotalObj as any).total_today || 0) : 0;

        if (amount > 10 || (todayTotal + amount) > 10) {
          status = 'pending';
        }
      }

      const transaction = await this.coinTransactionModel.create(
        { ...dto, status } as any,
        { transaction: t }
      );

      // Agar tranzaksiya admin tasdig'ini kutayotgan bo'lsa
      if (status === 'pending') {
        // Barcha adminlarga xabarnoma yuborish
        const admins = await this.userModel.findAll({ where: { role: 'admin' }, transaction: t });
        const giver = dto.created_by ? await this.userModel.findByPk(dto.created_by, { transaction: t }) : null;
        const receiver = await this.userModel.findByPk(dto.user_id, { transaction: t });
        
        for (const admin of admins) {
          await this.notificationService.create({
            user_id: admin.id,
            title: 'Tanga qo\'shish tasdig\'i',
            message: `${giver?.fullname || 'Foydalanuvchi'} o'quvchi ${receiver?.fullname || 'student'} ga jami kunlik yoki birdaniga 10 tadan ortiq tanga qo'shmoqchi. Iltimos, ma'qullang.`,
            type: 'info',
            is_read: false,
          } as any);
        }
        
        return {
          status: 'pending',
          message: 'Bir kun ichida 10 tadan ortiq tanga qo\'shish uchun admin tasdig\'i kutilmoqda. Tasdiqlangach, tangalar qo\'shiladi.',
          transaction,
        };
      }

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
      where: { 
        user_id,
        status: { [Op.or]: ['approved', { [Op.is]: null }] }
      } as any,
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

  // === Haftalik davr hisoblagich ===
  // Dushanba 00:00 dan boshlab, Juma 17:00 da yangilanadi
  // Juma 17:00 gacha — OLDINGI hafta ko'rinadi
  // Juma 17:00 dan keyin — JORIY hafta ko'rinadi
  private getWeeklyPeriod(): { start: Date; end: Date; isCurrent: boolean } {
    // UTC+5 (O'zbekiston vaqti)
    const UZ_OFFSET = 5 * 60 * 60 * 1000;
    const now = new Date();
    const uzNow = new Date(now.getTime() + UZ_OFFSET);

    // O'zbekiston vaqtida haftaning kuni (0=Yakshanba, 1=Dushanba, ..., 5=Juma, 6=Shanba)
    const dayOfWeek = uzNow.getUTCDay();
    // Dushanbaga nisbatan qancha kun o'tgan (Dushanba=0, Seshanba=1, ..., Yakshanba=6)
    const daysSinceMonday = (dayOfWeek + 6) % 7;

    // SHU haftaning dushanbasi 00:00 (UZ vaqtida)
    const thisMonday = new Date(uzNow);
    thisMonday.setUTCDate(uzNow.getUTCDate() - daysSinceMonday);
    thisMonday.setUTCHours(0, 0, 0, 0);

    // SHU haftaning jumasi 17:00 (UZ vaqtida)
    const thisFriday17 = new Date(thisMonday);
    thisFriday17.setUTCDate(thisMonday.getUTCDate() + 4); // Juma = Dushanba + 4
    thisFriday17.setUTCHours(17, 0, 0, 0);

    // UTC ga qaytarish (UZ vaqtidan UTC offset'ni ayiramiz)
    const thisMondayUTC = new Date(thisMonday.getTime() - UZ_OFFSET);
    const thisFriday17UTC = new Date(thisFriday17.getTime() - UZ_OFFSET);

    if (uzNow >= thisFriday17) {
      // Juma 17:00 dan keyin — JORIY haftani ko'rsat
      return {
        start: thisMondayUTC,
        end: now,
        isCurrent: true,
      };
    } else {
      // Juma 17:00 gacha — OLDINGI haftani ko'rsat
      const prevMonday = new Date(thisMondayUTC.getTime() - 7 * 24 * 60 * 60 * 1000);
      const prevSunday = new Date(thisMondayUTC.getTime() - 1); // Oldingi yakshanba 23:59:59
      return {
        start: prevMonday,
        end: prevSunday,
        isCurrent: false,
      };
    }
  }

  // === Foydalanuvchining haftalik o'zgarishi (foizda) ===
  async getWeeklyChange(user_id: number) {
    const period = this.getWeeklyPeriod();

    // Belgilangan davr ichidagi barcha tranzaksiyalar summasi
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
        [Op.or]: [
          { status: 'approved' },
          { status: { [Op.is]: null } }
        ] as any,
        createdAt: {
          [Op.gte]: period.start,
          [Op.lte]: period.end,
        },
      },
      raw: true,
    });

    const weeklyChange = parseInt((result as any)?.weekly_sum || '0', 10);

    // Hozirgi balans
    const user = await this.userModel.findByPk(user_id, {
      attributes: ['id', 'coins', 'fullname', 'username'],
    });
    const currentCoins = user?.coins || 0;

    // Davr boshidagi balans (hozirgi - haftalik o'zgarish)
    const previousBalance = currentCoins - weeklyChange;

    // Foiz hisoblanishi
    let percentageChange = 0;
    if (previousBalance > 0) {
      percentageChange = Math.round((weeklyChange / previousBalance) * 100);
    } else if (weeklyChange > 0) {
      percentageChange = 100;
    }

    return {
      user_id,
      current_coins: currentCoins,
      weekly_change: weeklyChange,
      previous_balance: previousBalance,
      percentage_change: percentageChange,
      period_start: period.start.toISOString(),
      period_end: period.end.toISOString(),
      is_current_week: period.isCurrent,
    };
  }

  // === Haftalik top 10 tanga ko'paygan talabalar ===
  async getWeeklyTopGainers(limit: number = 10) {
    const period = this.getWeeklyPeriod();

    // Belgilangan davr ichida eng ko'p tanga olgan studentlar
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
        [Op.or]: [
          { status: 'approved' },
          { status: { [Op.is]: null } }
        ] as any,
        createdAt: {
          [Op.gte]: period.start,
          [Op.lte]: period.end,
        },
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

    const data = results.map((item: any, index: number) => {
      const raw = item.get({ plain: true });
      const weeklyEarned = Number(raw.weekly_earned || 0);
      const currentCoins = raw.receiver?.coins || 0;
      const previousBalance = currentCoins - weeklyEarned;
      const percentageChange = previousBalance > 0
        ? Math.round((weeklyEarned / previousBalance) * 100)
        : weeklyEarned > 0 ? 100 : 0;

      return {
        rank: index + 1,
        user_id: raw.user_id,
        fullname: raw.receiver?.fullname || raw.receiver?.username || 'Noma\'lum',
        username: raw.receiver?.username,
        profile_picture: raw.receiver?.profile_picture,
        current_coins: currentCoins,
        weekly_earned: weeklyEarned,
        percentage_change: percentageChange,
        class_id: raw.receiver?.class_id,
      };
    });

    return {
      data,
      period_start: period.start.toISOString(),
      period_end: period.end.toISOString(),
      is_current_week: period.isCurrent,
    };
  }
  // === YANGI: Shubhali tranzaksiyalarni aniqlash ===
  async getSuspiciousActivity() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

    // 1. Bugun eng ko'p tanga ulashganlar (amount > 0 and type = 'reward')
    const topGiversRows = await this.coinTransactionModel.findAll({
      attributes: [
        'created_by',
        [
          this.coinTransactionModel.sequelize!.fn(
            'SUM',
            this.coinTransactionModel.sequelize!.col('amount'),
          ),
          'total_given',
        ],
        [
          this.coinTransactionModel.sequelize!.fn(
            'COUNT',
            this.coinTransactionModel.sequelize!.col('id'),
          ),
          'transaction_count',
        ],
      ],
      where: {
        type: 'reward',
        amount: { [Op.gt]: 0 },
        created_by: { [Op.not]: null as any },
        createdAt: { [Op.gte]: today },
        [Op.or]: [
          { status: 'approved' },
          { status: null as any }
        ]
      } as any,
      include: [
        {
          model: User,
          as: 'giver',
          attributes: ['id', 'fullname', 'username', 'role'],
        },
      ],
      group: ['created_by', 'giver.id'],
      order: [[this.coinTransactionModel.sequelize!.literal('total_given'), 'DESC']],
      limit: 10,
    });

    // 2. Bugun eng ko'p tanga yig'ganlar
    const topReceiversRows = await this.coinTransactionModel.findAll({
      attributes: [
        'user_id',
        [
          this.coinTransactionModel.sequelize!.fn(
            'SUM',
            this.coinTransactionModel.sequelize!.col('amount'),
          ),
          'total_received',
        ],
      ],
      where: {
        type: 'reward',
        amount: { [Op.gt]: 0 },
        createdAt: { [Op.gte]: today },
        [Op.or]: [
          { status: 'approved' },
          { status: null as any }
        ]
      } as any,
      include: [
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'fullname', 'username', 'role'],
        },
      ],
      group: ['user_id', 'receiver.id'],
      order: [[this.coinTransactionModel.sequelize!.literal('total_received'), 'DESC']],
      limit: 10,
    });

    // 3. Shubhali takroriy tranzaksiyalar (bitta o'qituvchidan bitta o'quvchiga bugun 3+ marta)
    const repeatedTransactionsRows = await this.coinTransactionModel.findAll({
      attributes: [
        'created_by',
        'user_id',
        [
          this.coinTransactionModel.sequelize!.fn('COUNT', this.coinTransactionModel.sequelize!.col('CoinTransactions.id')),
          'transfer_count',
        ],
        [
          this.coinTransactionModel.sequelize!.fn('SUM', this.coinTransactionModel.sequelize!.col('amount')),
          'total_amount',
        ],
      ],
      where: {
        type: 'reward',
        amount: { [Op.gt]: 0 },
        created_by: { [Op.not]: null as any },
        createdAt: { [Op.gte]: today },
        [Op.or]: [
          { status: 'approved' },
          { status: null as any }
        ]
      } as any,
      include: [
        {
          model: User,
          as: 'giver',
          attributes: ['id', 'fullname', 'username'],
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'fullname', 'username'],
        },
      ],
      group: ['created_by', 'user_id', 'giver.id', 'receiver.id'],
      having: this.coinTransactionModel.sequelize!.where(
        this.coinTransactionModel.sequelize!.fn('COUNT', this.coinTransactionModel.sequelize!.col('CoinTransactions.id')),
        '>=',
        3
      ),
      order: [[this.coinTransactionModel.sequelize!.literal('transfer_count'), 'DESC']],
    });

      return {
        topGivers: topGiversRows.map((item: any) => {
          const raw = item.get({ plain: true });
          return {
            ...raw,
            total_given: Number(raw.total_given || 0),
            transaction_count: Number(raw.transaction_count || 0)
          };
        }),
        topReceivers: topReceiversRows.map((item: any) => {
          const raw = item.get({ plain: true });
          return {
            ...raw,
            total_received: Number(raw.total_received || 0)
          };
        }),
        repeatedTransactions: repeatedTransactionsRows.map((item: any) => {
          const raw = item.get({ plain: true });
          return {
            ...raw,
            transfer_count: Number(raw.transfer_count || 0),
            total_amount: Number(raw.total_amount || 0)
          };
        }),
      };
    } catch (error) {
      console.error('Error in getSuspiciousActivity:', error);
      throw error;
    }
  }

  // === ADMIN uchun: Pending tranzaksiyalar ro'yxati ===
  async getPendingTransactions() {
    return this.coinTransactionModel.findAll({
      where: { status: 'pending' },
      include: this.getIncludes(),
      order: [['createdAt', 'DESC']],
    });
  }

  // === ADMIN uchun: Pending tranzaksiyani tasdiqlash ===
  async approvePending(id: number) {
    const sequelize = this.coinTransactionModel.sequelize;
    if (!sequelize) throw new HttpException('Sequelize topilmadi', 500);

    const t = await sequelize.transaction();

    try {
      const transaction = await this.coinTransactionModel.findByPk(id, { transaction: t });
      if (!transaction) throw new NotFoundException('Tranzaksiya topilmadi');
      
      const currentStatus = transaction.getDataValue('status') || transaction.status;
      if (currentStatus !== 'pending') {
        throw new HttpException('Bu tranzaksiya allaqachon ko\'rib chiqilgan yoko status belgilanmagan', HttpStatus.BAD_REQUEST);
      }

      transaction.setDataValue('status', 'approved');
      await transaction.save({ transaction: t });

      const user = await this.userModel.findByPk(transaction.user_id, { transaction: t });
      if (user) {
        // Tanga qo'shish
        await user.increment('coins', {
          by: Number(transaction.amount),
          transaction: t,
        });

        // O'quvchiga xabar berish
        await this.notificationService.create({
          user_id: user.id,
          title: 'Tangalar qabul qilindi',
          message: `Admin tomonidan sizga ${transaction.amount} ta tanga tasdiqlandi. Sabab: ${transaction.reason || 'belgilanmagan'}`,
          type: 'reward',
        } as any);
      }

      // O'qituvchiga ham xabar yuborish
      if (transaction.created_by) {
         await this.notificationService.create({
          user_id: transaction.created_by,
          title: 'Tanga qo\'shish tasdiqlandi',
          message: `Sizning ${transaction.amount} tanga qo'shish so'rovingiz admin tomonidan tasdiqlandi.`,
          type: 'info',
        } as any);
      }

      await t.commit();
      return transaction;
    } catch (error) {
      await t.rollback();
      throw new HttpException(
        error.message || 'Tranzaksiyani tasdiqlashda xatolik yuz berdi',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === ADMIN uchun: Barcha pending tranzaksiyalarni tasdiqlash ===
  async approveAllPending() {
    const sequelize = this.coinTransactionModel.sequelize;
    if (!sequelize) throw new HttpException('Sequelize topilmadi', 500);

    const t = await sequelize.transaction();

    try {
      const transactions = await this.coinTransactionModel.findAll({
        where: { status: 'pending' },
        transaction: t,
      });

      if (transactions.length === 0) {
        throw new HttpException('Tasdiqlash uchun pending tranzaksiyalar topilmadi', HttpStatus.NOT_FOUND);
      }

      const results: CoinTransactions[] = [];
      for (const transaction of transactions) {
        transaction.setDataValue('status', 'approved');
        await transaction.save({ transaction: t });

        const user = await this.userModel.findByPk(transaction.user_id, { transaction: t });
        if (user) {
          await user.increment('coins', {
            by: Number(transaction.amount),
            transaction: t,
          });

          await this.notificationService.create({
            user_id: user.id,
            title: 'Tangalar qabul qilindi',
            message: `Admin tomonidan barcha so'rovlar tasdiqlandi va sizga ${transaction.amount} ta tanga qo'shildi. Sabab: ${transaction.reason || 'belgilanmagan'}`,
            type: 'reward',
          } as any);
        }

        if (transaction.created_by) {
          await this.notificationService.create({
            user_id: transaction.created_by,
            title: 'Tanga qo\'shish tasdiqlandi',
            message: `Sizning ${transaction.amount} tanga qo'shish so'rovingiz admin tomonidan tasdiqlandi (ommaviy tasdiqlash).`,
            type: 'info',
          } as any);
        }
        results.push(transaction);
      }

      await t.commit();
      return {
        message: `${results.length} ta tranzaksiya muvaffaqiyatli tasdiqlandi`,
        count: results.length,
      };
    } catch (error) {
      await t.rollback();
      throw new HttpException(
        error.message || 'Tranzaksiyalarni ommaviy tasdiqlashda xatolik yuz berdi',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // === ADMIN uchun: Pending tranzaksiyani rad etish ===
  async rejectPending(id: number) {
    const transaction = await this.coinTransactionModel.findByPk(id);
    if (!transaction) throw new NotFoundException('Tranzaksiya topilmadi');
    const currentStatus = transaction.getDataValue('status') || transaction.status;
    if (currentStatus !== 'pending') {
      throw new HttpException('Bu tranzaksiya allaqachon ko\'rib chiqilgan', HttpStatus.BAD_REQUEST);
    }

    transaction.setDataValue('status', 'rejected');
    await transaction.save();

    // O'qituvchiga xabar yuborish
    if (transaction.created_by) {
      await this.notificationService.create({
          user_id: transaction.created_by,
          title: 'Tanga qo\'shish rad etildi',
          message: `Sizning ${transaction.amount} tanga qo'shish so'rovingiz admin tomonidan rad etildi.`,
          type: 'info',
      } as any);
    }

    return transaction;
  }
}
