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

@Injectable()
export class CoinTransactionsService {
  constructor(
    @InjectModel(CoinTransactions)
    private readonly coinTransactionModel: typeof CoinTransactions,
    @InjectModel(User)
    private readonly userModel: typeof User,
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
      const transaction = await this.coinTransactionModel.create(
        dto as any,
        { transaction: t }
      );

      // User.coins maydonini manual usulda xavfsiz yangilash
      // getDataValue ishlatamiz chunki public class field Sequelize getter'ini shadow qiladi
      const user = await this.userModel.findByPk(dto.user_id, { transaction: t });
      if (user) {
        const currentCoins = Number(user.getDataValue('coins')) || 0;
        user.setDataValue('coins', currentCoins + dto.amount);
        await user.save({ transaction: t });
        console.log(`DEBUG coins updated: userId=${dto.user_id}, old=${currentCoins}, change=${dto.amount}, new=${currentCoins + dto.amount}`);
      }

      return transaction;
    } catch (error) {
      console.error('Tranzaksiya yaratishdagi asil xato:', error);
      throw new HttpException(
        'Coin tranzaksiyasi yaratishda xatolik yuz berdi: ' + (error.message || ''),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bir nechta tranzaksiya qo'shish (bulk)
  async createMany(dtos: CreateCoinTransactionDto[]) {
    try {
      return await this.coinTransactionModel.bulkCreate(dtos as any);
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Bir nechta tranzaksiya qo‘shishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
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
}
