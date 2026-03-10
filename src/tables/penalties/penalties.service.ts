// src/tables/penalty/penalties.service.ts (papka tuzilishingizga moslashtiring)

import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreatePenaltyDto } from './dto/create-penalty.dto';
import { UpdatePenaltyDto } from './dto/update-penalty.dto';
import { Penalties } from './penalties.model';
import { User } from '../user/user.model';
import { Auction } from '../auctions/auctions.model';
import { CoinTransactionsService } from '../coin_transactions/coin_transactions.service';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class PenaltiesService {
  constructor(
    @InjectModel(Penalties)
    private readonly penaltyModel: typeof Penalties,
    private readonly coinTransactionsService: CoinTransactionsService,
    private readonly sequelize: Sequelize,
  ) {}

  // Yangi jarima qo'shish
  async create(createPenaltyDto: CreatePenaltyDto) {
    return await this.sequelize.transaction(async (t) => {
      const newPenalty = await this.penaltyModel.create(
        createPenaltyDto as Penalties,
        { transaction: t },
      );

      // Jarima summasi miqdorida manfiy tranzaksiya yaratish
      await this.coinTransactionsService.create(
        {
          user_id: createPenaltyDto.user_id,
          amount: -Math.abs(createPenaltyDto.coin_penalty),
          type: 'penalty',
          reason: `Jarima: ${createPenaltyDto.reason}`,
          created_by: createPenaltyDto.issued_by,
        },
        t,
      );

      return newPenalty;
    });
  }

  // Bir nechta jarima birda qo'shish (test yoki admin uchun foydali)
  async createMany(createPenaltyDtos: CreatePenaltyDto[]) {
    try {
      const newPenalties = await this.penaltyModel.bulkCreate(
        createPenaltyDtos as Penalties[],
      );
      return newPenalties;
    } catch (error) {
      console.log(error.message);
      throw new HttpException(
        'Bir nechta jarima qo‘shishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha jarimalarni olish
  async findAll() {
    try {
      const penalties = await this.penaltyModel.findAll({
        include: [
          {
            model: User,
            as: 'receiver', // jarima olgan o'quvchi
            attributes: ['id', 'fullname', 'role', 'class_name'],
          },
          {
            model: User,
            as: 'issuer', // jarima bergan moderator
            attributes: ['id', 'fullname', 'role'],
          },
        ],
        order: [['createdAt', 'DESC']], // yangi jarimalar birinchi chiqadi
      });
      return penalties;
    } catch (err) {
      throw new HttpException(
        err.message || 'Barcha jarimalarni olishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bitta jarimani ID bo‘yicha olish
  async findOne(id: number) {
    const penalty = await this.penaltyModel.findByPk(id, {
      include: [
        {
          model: User,
          as: 'receiver', // jarima olgan o'quvchi
          attributes: ['id', 'fullname', 'role', 'class_name'],
        },
        {
          model: User,
          as: 'issuer', // jarima bergan moderator
          attributes: ['id', 'fullname', 'role'],
        },
      ],
    });

    if (!penalty) {
      throw new NotFoundException(`ID si ${id} bo‘lgan jarima topilmadi`);
    }

    return penalty;
  }

  // Jarimani yangilash (masalan, sababini tuzatish)
  async update(id: number, updatePenaltyDto: UpdatePenaltyDto) {
    const [updatedCount] = await this.penaltyModel.update(updatePenaltyDto, {
      where: { id },
    });

    if (updatedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan jarima topilmadi`);
    }

    return this.penaltyModel.findByPk(id);
  }

  // Jarimani o‘chirish (ehtiyotkorlik bilan – log saqlash uchun soft delete ham qo‘shish mumkin)
  async remove(id: number) {
    const deletedCount = await this.penaltyModel.destroy({ where: { id } });

    if (deletedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan jarima topilmadi`);
    }

    return { message: `ID si ${id} bo‘lgan jarima muvaffaqiyatli o‘chirildi` };
  }

  // Qo‘shimcha: O'quvchi qancha jarima olgani
  async findByUserId(user_id: number) {
    const penalties = await this.penaltyModel.findAll({
      where: { user_id },
      order: [['createdAt', 'DESC']],
    });

    return penalties;
  }

  // Qo‘shimcha: Auksiondagi intizom choralari
  async findByAuctionId(auction_id: number) {
    const penalties = await this.penaltyModel.findAll({
      where: { auction_id },
      order: [['createdAt', 'DESC']],
    });

    return penalties;
  }
}
