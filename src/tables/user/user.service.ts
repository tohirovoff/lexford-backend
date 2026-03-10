// src/user/user.service.ts (yangilangan versiya)

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './user.model';
import { ConfigService } from 'src/common/config/config.service';
import { Penalties } from '../penalties/penalties.model';
import { Bids } from '../bids/bids.model';
import { AuctionItems } from '../action-items/auction-items.model';
import { CoinTransactions } from '../coin_transactions/coin_transactions.model';
import { CoinBlock } from '../coin_blocks/coin_blocks.model';
import { AuctionLog } from '../auction_logs/auction_logs.model';
import { Attendance } from '../attendance/attendance.model';
import { Class } from '../classes/classes.model';
import { Op } from 'sequelize';

export interface SchoolLeaderboardEntry {
  rank: number;
  user_id: number;
  fullname: string;
  username: string;
  class_name?: string | null;
  coins: number;
  blocked_coins: number;
  total_coins: number;
  profile_picture?: string | null;
}

export interface SchoolLeaderboardResponse {
  data: SchoolLeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User)
    readonly userModel: typeof User,
    private readonly configService: ConfigService,
  ) {}

  // Har bir queryda ishlatiladigan include — takrorlanmaslik uchun
  private getUserIncludes() {
    return [
      { model: Penalties, as: 'receivedPenalties' },
      { model: Penalties, as: 'issuedPenalties' },
      { model: AuctionItems, as: 'auctionItems' },
      { model: Bids, as: 'stavkalar' },
      { model: CoinTransactions, as: 'receivedTransactions' },
      { model: CoinTransactions, as: 'givenTransactions' },
      { model: CoinBlock, as: 'coinBlocks' },
      { model: AuctionLog, as: 'auctionLogs' },
      { model: Attendance },
      { model: Class, as: 'managedClasses' },
      { model: Class, as: 'class' },
    ];
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.userModel.create(createUserDto as any);
      return user;
    } catch (err) {
      throw new HttpException(
        'Foydalanuvchi yaratib bo‘lmadi',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll() {
    const users = await this.userModel.findAll({
      include: this.getUserIncludes(),
    });
    return users;
  }

  async getMe(userId: number) {
    const user = await this.userModel.findByPk(userId, {
      include: this.getUserIncludes(),
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return user;
  }

  async findOne(id: number) {
    const user = await this.userModel.findByPk(id, {
      include: this.getUserIncludes(),
    });

    if (!user) {
      throw new NotFoundException(
        `ID si ${id} bo‘lgan foydalanuvchi topilmadi`,
      );
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const [updatedRowsCount] = await this.userModel.update(updateUserDto, {
      where: { id },
    });

    if (updatedRowsCount === 0) {
      throw new NotFoundException(
        `ID si ${id} bo‘lgan foydalanuvchi topilmadi`,
      );
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const deleted = await this.userModel.destroy({ where: { id } });
    if (deleted === 0) {
      throw new NotFoundException(
        `ID si ${id} bo‘lgan foydalanuvchi topilmadi`,
      );
    }
    return true;
  }

  // === YANGI: Butun maktab bo'yicha leaderboard (faqat studentlar) ===
  // src/user/user.service.ts
  async getSchoolLeaderboard(
    page: number = 1,
    pageSize: number = 50,
  ): Promise<SchoolLeaderboardResponse> {
    const offset = (page - 1) * pageSize;

    const { rows, count } = await this.userModel.findAndCountAll({
      where: {
        role: 'student',
      },
      attributes: [
        'id',
        ['username', 'username'], // majburiy alias
        ['fullname', 'fullname'], // majburiy alias
        ['class_name', 'class_name'],
        ['coins', 'coins'],
        ['profile_picture', 'profile_picture'],
        [
          this.userModel.sequelize!.literal(
            `(SELECT COALESCE(SUM(blocked_amount), 0) 
           FROM coin_blocks 
           WHERE coin_blocks.user_id = "User".id 
             AND coin_blocks.status = 'blocked')`,
          ),
          'blocked_coins',
        ],
      ],
      order: [
        ['coins', 'DESC'], // ← FAQAT oddiy coins bo'yicha tartiblash!
      ],
      limit: pageSize,
      offset,
      subQuery: false,
      raw: true, // ← RAW natija olish — eng ishonchli usul!
    });

    const data: SchoolLeaderboardEntry[] = rows.map(
      (user: any, index: number) => {
        // RAW natijada maydon nomlari to'g'ridan-to'g'ri keladi
        const displayName =
          user.fullname?.trim() && user.fullname !== ''
            ? user.fullname.trim()
            : user.username?.trim() && user.username !== ''
              ? user.username.trim()
              : `O'quvchi #${offset + index + 1}`;

        const blocked = Number(user.blocked_coins || 0);
        const coins = Number(user.coins || 0);

        return {
          rank: offset + index + 1,
          user_id: user.id,
          fullname: displayName,
          username: user.username || null,
          class_name: user.class_name || null,
          coins,
          blocked_coins: blocked,
          total_coins: coins + blocked,
          profile_picture:
            user.profile_picture || '/uploads/default-avatar.png',
        };
      },
    );

    return {
      data,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }
  async bulkUpdate(
    updates: Array<{
      username?: string;
      id?: number;
      data: Partial<UpdateUserDto>;
    }>,
  ): Promise<{
    success: boolean;
    updatedCount: number;
    failedCount: number;
    details: Array<{
      username?: string;
      id?: number;
      success: boolean;
      error?: string;
    }>;
  }> {
    if (!updates || updates.length === 0) {
      throw new BadRequestException(
        'Yangilanish uchun maʼlumotlar massivi boʼsh',
      );
    }

    const results: Array<{
      username?: string;
      id?: number;
      success: boolean;
      error?: string;
    }> = [];
    let updatedCount = 0;
    let failedCount = 0;

    for (const item of updates) {
      const { username, id, data } = item;

      // Identifikator tekshiruvi
      if (!username && !id) {
        results.push({
          username,
          id,
          success: false,
          error: 'username yoki id majburiy maydon',
        });
        failedCount++;
        continue;
      }

      // Yangilanish ma'lumotlari tekshiruvi
      if (!data || Object.keys(data).length === 0) {
        results.push({
          username,
          id,
          success: false,
          error: 'Yangilanish uchun data boʼsh',
        });
        failedCount++;
        continue;
      }

      try {
        const where: any = {};
        if (username) where.username = username;
        if (id) where.id = id;

        const [affectedRows] = await this.userModel.update(data, {
          where,
        });

        if (affectedRows === 0) {
          results.push({
            username,
            id,
            success: false,
            error: 'Foydalanuvchi topilmadi',
          });
          failedCount++;
        } else {
          results.push({
            username,
            id,
            success: true,
          });
          updatedCount++;
        }
      } catch (error: any) {
        results.push({
          username,
          id,
          success: false,
          error: error.message || 'Server xatosi',
        });
        failedCount++;
      }
    }

    return {
      success: updatedCount > 0,
      updatedCount,
      failedCount,
      details: results,
    };
  }

  // Qo'shimcha: Maktabning TOP-10 o'quvchisi (masalan, bosh sahifada ko'rsatish uchun)
  async getSchoolTop10(): Promise<SchoolLeaderboardEntry[]> {
    const result = await this.getSchoolLeaderboard(1, 10);
    return result.data;
  }
}
