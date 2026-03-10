// src/tables/coin-block/coin-blocks.service.ts

import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CoinBlock } from './coin_blocks.model';
import { CreateCoinBlockDto } from './dto/create-coin_block.dto';
import { UpdateCoinBlockDto } from './dto/update-coin_block.dto';
import { User } from '../user/user.model';
import { AuctionItems } from '../action-items/auction-items.model';
import { Transaction } from 'sequelize';

@Injectable()
export class CoinBlocksService {
  constructor(
    @InjectModel(CoinBlock)
    private readonly coinBlockModel: typeof CoinBlock,
  ) {}

  // Yangi coin bloklash qo'shish (masalan, auksion yutganidan keyin)
  async create(
    createCoinBlockDto: CreateCoinBlockDto,
    transaction?: Transaction,
  ) {
    try {
      const newBlock = await this.coinBlockModel.create(
        createCoinBlockDto as CoinBlock,
        { transaction },
      );
      return newBlock;
    } catch (err) {
      console.log(err.message);
      throw new HttpException(
        'Coin bloklash qo‘shishda xatolik yuz berdi',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOneByFilter(where: any, transaction?: Transaction) {
    return this.coinBlockModel.findOne({ where, transaction });
  }

  // Bir nechta bloklashni birda qo'shish (test yoki massoviy operatsiya uchun)
  async createMany(createCoinBlockDtos: CreateCoinBlockDto[]) {
    try {
      const newBlocks = await this.coinBlockModel.bulkCreate(
        createCoinBlockDtos as CoinBlock[],
      );
      return newBlocks;
    } catch (error) {
      console.log(error.message);
      throw new HttpException(
        'Bir nechta coin bloklash qo‘shishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha bloklashlarni olish
  async findAll() {
    try {
      const blocks = await this.coinBlockModel.findAll({
        include: [{ model: User }, { model: AuctionItems }],
        order: [['createdAt', 'DESC']], // yangi bloklar birinchi
      });
      return blocks;
    } catch (err) {
      throw new HttpException(
        err.message || 'Barcha coin bloklashlarni olishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bitta bloklashni ID bo‘yicha olish
  async findOne(id: number) {
    const block = await this.coinBlockModel.findByPk(id, {
      include: [{ model: User }, { model: AuctionItems }],
    });

    if (!block) {
      throw new NotFoundException(
        `ID si ${id} bo‘lgan coin bloklash topilmadi`,
      );
    }

    return block;
  }

  // Bloklashni yangilash (masalan, muddatini o'zgartirish)
  async update(id: number, updateCoinBlockDto: UpdateCoinBlockDto) {
    const [updatedCount] = await this.coinBlockModel.update(
      updateCoinBlockDto,
      {
        where: { id },
      },
    );

    if (updatedCount === 0) {
      throw new NotFoundException(
        `ID si ${id} bo‘lgan coin bloklash topilmadi`,
      );
    }

    return this.coinBlockModel.findByPk(id);
  }

  // Bloklashni o‘chirish (bloklash tugagandan keyin)
  async remove(id: number) {
    const deletedCount = await this.coinBlockModel.destroy({ where: { id } });

    if (deletedCount === 0) {
      throw new NotFoundException(
        `ID si ${id} bo‘lgan coin bloklash topilmadi`,
      );
    }

    return {
      message: `ID si ${id} bo‘lgan coin bloklash muvaffaqiyatli o‘chirildi`,
    };
  }

  // Qo‘shimcha: Foydalanuvchi bo‘yicha bloklashlarni olish
  async findByUserId(user_id: number) {
    const blocks = await this.coinBlockModel.findAll({
      where: { user_id },
      order: [['createdAt', 'DESC']],
    });

    return blocks;
  }
}
