// src/tables/auction-log/auction-logs.service.ts

import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateAuctionLogDto } from './dto/create-auction_log.dto';
import { UpdateAuctionLogDto } from './dto/update-auction_log.dto';
import { AuctionLog } from './auction_logs.model';
import { Auction } from '../auctions/auctions.model';
import { User } from '../user/user.model';

@Injectable()
export class AuctionLogsService {
  constructor(
    @InjectModel(AuctionLog)
    private readonly auctionLogModel: typeof AuctionLog,
  ) {}

  // Yangi log yozish
  async create(createAuctionLogDto: CreateAuctionLogDto) {
    try {
      const newLog = await this.auctionLogModel.create(
        createAuctionLogDto as AuctionLog,
      );
      return newLog;
    } catch (err) {
      console.log(err.message);
      throw new HttpException(
        'Auksion logini qo‘shishda xatolik yuz berdi',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bir nechta log birda qo'shish (test yoki migratsiya uchun)
  async createMany(createAuctionLogDtos: CreateAuctionLogDto[]) {
    try {
      const newLogs = await this.auctionLogModel.bulkCreate(
        createAuctionLogDtos as AuctionLog[],
      );
      return newLogs;
    } catch (error) {
      console.log(error.message);
      throw new HttpException(
        'Bir nechta auksion logini qo‘shishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha loglarni olish
  async findAll() {
    try {
      const logs = await this.auctionLogModel.findAll({
        include: [{ model: Auction }, { model: User }],
        order: [['createdAt', 'DESC']], // yangi loglar birinchi
      });
      return logs;
    } catch (err) {
      throw new HttpException(
        err.message || 'Barcha auksion loglarini olishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bitta logni ID bo‘yicha olish
  async findOne(id: number) {
    const log = await this.auctionLogModel.findByPk(id, {
      include: [{ model: Auction }, { model: User }],
    });

    if (!log) {
      throw new NotFoundException(`ID si ${id} bo‘lgan auksion logi topilmadi`);
    }

    return log;
  }

  // Logni yangilash (masalan, description tuzatish – kam ishlatiladi, lekin bor)
  async update(id: number, updateAuctionLogDto: UpdateAuctionLogDto) {
    const [updatedCount] = await this.auctionLogModel.update(
      updateAuctionLogDto,
      {
        where: { id },
      },
    );

    if (updatedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan auksion logi topilmadi`);
    }

    return this.auctionLogModel.findByPk(id);
  }

  // Logni o‘chirish (ehtiyotkorlik bilan – odatda log o‘chirilmaydi)
  async remove(id: number) {
    const deletedCount = await this.auctionLogModel.destroy({ where: { id } });

    if (deletedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan auksion logi topilmadi`);
    }

    return {
      message: `ID si ${id} bo‘lgan auksion logi muvaffaqiyatli o‘chirildi`,
    };
  }

  // Qo‘shimcha: Ma'lum auksion bo‘yicha loglarni olish (eng foydali metod)
  async findByAuctionId(auction_id: number) {
    const logs = await this.auctionLogModel.findAll({
      where: { auction_id },
      order: [['createdAt', 'ASC']],
    });

    return logs;
  }

  // Qo‘shimcha: Ma'lum action_type bo‘yicha loglarni olish
  async findByActionType(action_type: string) {
    const logs = await this.auctionLogModel.findAll({
      where: { action_type },
      order: [['createdAt', 'DESC']],
    });

    return logs;
  }
}
