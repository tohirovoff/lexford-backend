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
import { CoinBlock } from '../coin_blocks/coin_blocks.model';
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

  // Faqat kerakli include'larni har bir metodga alohida qo'shamiz
  // Eski getUserIncludes() 11 ta JOIN qilar edi — bu eng asosiy bottleneck edi!
  private getMinimalIncludes() {
    return [
      { model: Class, as: 'class', attributes: ['id', 'name'] },
    ];
  }

  async getDashboardStats() {
    const [studentsCount, teachersCount, classesCount] = await Promise.all([
      this.userModel.count({ where: { role: 'student' } }),
      this.userModel.count({ where: { role: 'teacher' } }),
      this.userModel.count({ where: { role: 'admin' } }), // Added admin count too
    ]);
    
    // We can also add some transaction stats here if needed, but the user only asked for these
    return { studentsCount, teachersCount, classesCount };
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

  async findAll(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    const { rows, count } = await this.userModel.findAndCountAll({
      include: this.getMinimalIncludes(),
      attributes: { exclude: ['password'] },
      limit,
      offset,
      distinct: true,
      order: [['createdAt', 'DESC']],
    });
    return {
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getMe(userId: number) {
    const user = await this.userModel.findByPk(userId, {
      include: this.getMinimalIncludes(),
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return user;
  }

  async findOne(id: number) {
    const user = await this.userModel.findByPk(id, {
      include: this.getMinimalIncludes(),
    });

    if (!user) {
      throw new NotFoundException(
        `ID si ${id} bo‘lgan foydalanuvchi topilmadi`,
      );
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Faqat ruxsat etilgan maydonlarni yangilash (password, role, coins kabi maydonlarni o'zgartirmaslik)
    const allowedFields = ['fullname', 'class_name', 'grade', 'profile_picture', 'bio'];
    const safeUpdateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (updateUserDto[field] !== undefined && updateUserDto[field] !== '') {
        safeUpdateData[field] = updateUserDto[field];
      }
    }

    if (Object.keys(safeUpdateData).length === 0) {
      throw new BadRequestException('Yangilash uchun hech qanday maʼlumot yuborilmadi');
    }

    const [updatedRowsCount] = await this.userModel.update(safeUpdateData, {
      where: { id },
    });

    if (updatedRowsCount === 0) {
      throw new NotFoundException(
        `ID si ${id} bo'lgan foydalanuvchi topilmadi`,
      );
    }

    const user = await this.findOne(id);
    const { password, ...userWithoutPassword } = user.get({ plain: true });
    return userWithoutPassword;
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

    // Total countni alohida olamiz, chunki GROUP BY ishlatilganda findAndCountAll noto'g'ri count qaytaradi
    const totalCount = await this.userModel.count({
      where: { role: 'student' },
    });

    const rows = await this.userModel.findAll({
      where: {
        role: 'student',
      },
      attributes: [
        'id',
        'username',
        'fullname',
        'coins',
        'profile_picture',
        'class_name',
        [
          this.userModel.sequelize!.literal(
            `COALESCE("class"."name", "User"."class_name")`,
          ),
          'display_class_name',
        ],
        [
          this.userModel.sequelize!.fn(
            'COALESCE',
            this.userModel.sequelize!.fn(
              'SUM',
              this.userModel.sequelize!.col('coinBlocks.blocked_amount'),
            ),
            0,
          ),
          'blocked_coins',
        ],
      ],
      include: [
        {
          model: Class,
          as: 'class',
          attributes: [], // Attributes literal orqali olinmoqda
          required: false,
        },
        {
          model: CoinBlock,
          as: 'coinBlocks',
          attributes: [],
          required: false,
          where: { status: 'blocked' },
        },
      ],
      group: [
        'User.id',
        'User.username',
        'User.fullname',
        'User.coins',
        'User.profile_picture',
        'User.class_name',
        'class.id',
      ],
      order: [['coins', 'DESC']],
      limit: pageSize,
      offset,
      subQuery: false,
      raw: true,
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
          class_name: user.display_class_name || user.class_name || null,
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
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
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

  async updateClass(id: number, classId: number | null) {
    const user = await this.userModel.findByPk(id);
    if (!user) {
      throw new NotFoundException(`Foydalanuvchi topilmadi`);
    }

    if (user.role !== 'student') {
      throw new BadRequestException('Faqat o‘quvchilarning sinfini o‘zgartirish mumkin');
    }

    return await user.update({ class_id: classId });
  }
}
