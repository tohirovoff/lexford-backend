// src/classes/classes.service.ts

import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Class } from './classes.model';
import { User } from '../user/user.model';
import { Attendance } from '../attendance/attendance.model';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Sequelize } from 'sequelize-typescript';
import { CoinBlock } from '../coin_blocks/coin_blocks.model';

export interface ClassLeaderboardEntry {
  rank: number;
  id: number;
  user_id: number;
  fullname: string;
  username: string;
  coins: number;
  blocked_coins: number;
  total_coins: number; // coins + blocked_coins (auksionda faol stavka bilan birga)
  profile_picture?: string | null;
}

export interface ClassLeaderboardResponse {
  data: ClassLeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClassesLeaderboardEntry {
  rank: number;
  class_id: number;
  name: string;
  grade: string;
  teacher_fullname: string;
  student_count: number;
  total_coins: number;
  average_coins: number;
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class)
    private readonly classModel: typeof Class,
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(CoinBlock)
    private readonly coinBlockModel: typeof CoinBlock,
    private readonly sequelize: Sequelize, // literal query uchun kerak
  ) {}

  // Yangi sinf qo'shish
  async create(createClassDto: CreateClassDto) {
    try {
      const newClass = await this.classModel.create({
        ...(createClassDto as any),
        student_count: 0,
      });
      return newClass;
    } catch (error) {
      throw new HttpException(
        'Sinf yaratishda xatolik yuz berdi',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bir nechta sinf qo'shish
  async createMany(createClassDtos: CreateClassDto[]) {
    try {
      const prepared = createClassDtos.map((dto) => ({
        ...(dto as any),
        student_count: 0,
      }));
      return await this.classModel.bulkCreate(prepared);
    } catch (error) {
      throw new HttpException(
        'Bir nechta sinf yaratishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha sinflarni olish — to'liq ma'lumot bilan
  async findAll() {
    return this.classModel.findAll({
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'username', 'fullname', 'role'],
        },
        {
          model: User,
          as: 'students',
          where: { role: 'student' },
          required: false, // LEFT JOIN — o'quvchilarsiz sinflar ham chiqishi uchun
          attributes: [
            'id',
            'username',
            'fullname',
            'coins',
            'profile_picture',
          ],
        },
        {
          model: Attendance,
          as: 'attendances',
          limit: 10,
          order: [['date', 'DESC']],
        },
      ],
      order: [
        ['grade', 'ASC'],
        ['name', 'ASC'],
      ],
    });
  }

  // Bitta sinfni ID bo'yicha olish — batafsil
  async findOne(id: number) {
    const classItem = await this.classModel.findByPk(id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'username', 'fullname'],
        },
        {
          model: User,
          as: 'students',
          where: { role: 'student' },
          required: false,
          attributes: [
            'id',
            'username',
            'fullname',
            'coins',
            'profile_picture',
          ],
        },
        {
          model: Attendance,
          as: 'attendances',
          order: [['date', 'DESC']],
        },
      ],
    });

    if (!classItem) {
      throw new NotFoundException(`ID: ${id} bo'lgan sinf topilmadi`);
    }

    return classItem;
  }

  // Sinfni yangilash
  async update(id: number, updateClassDto: UpdateClassDto) {
    const classItem = await this.findOne(id);
    await classItem.update(updateClassDto);
    return classItem.reload();
  }

  // Sinfni o'chirish
  async remove(id: number) {
    const classItem = await this.findOne(id);

    if (classItem.student_count > 0) {
      throw new HttpException(
        "Sinfda o'quvchilar bor — avval ularni boshqa sinfga o'tkazing",
        HttpStatus.BAD_REQUEST,
      );
    }

    await classItem.destroy();
    return { message: `ID: ${id} bo'lgan sinf muvaffaqiyatli o'chirildi` };
  }

  // O'quvchilar sonini yangilash
  async updateStudentCount(classId: number) {
    const count = await this.userModel.count({
      where: { class_id: classId, role: 'student' },
    });

    await this.classModel.update(
      { student_count: count },
      { where: { id: classId } },
    );
  }

  // === YANGI: Sinf bo'yicha leaderboard (pagination bilan) ===
  async getClassLeaderboard(
    classId: number,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<ClassLeaderboardResponse> {
    // Sinf mavjudligini tekshirish
    const classExists = await this.classModel.findByPk(classId);
    if (!classExists) {
      throw new NotFoundException(`ID: ${classId} bo'lgan sinf topilmadi`);
    }

    const offset = (page - 1) * pageSize;

    const { rows, count } = await this.userModel.findAndCountAll({
      where: {
        class_id: classId,
        role: 'student',
      },
      attributes: [
        'id',
        'username',
        'fullname',
        'coins',
        'profile_picture',
        // Bloklangan coinlar summasi
        [
          this.sequelize.literal(
            `(SELECT COALESCE(SUM(blocked_amount), 0) 
              FROM coin_blocks 
              WHERE coin_blocks.user_id = "User".id 
                AND coin_blocks.status = 'blocked')`,
          ),
          'blocked_coins',
        ],
      ],
      order: [
        this.sequelize.literal(
          '"coins" + COALESCE((SELECT SUM(blocked_amount) FROM coin_blocks WHERE coin_blocks.user_id = "User".id AND coin_blocks.status = \'blocked\'), 0) DESC',
        ),
      ],
      limit: pageSize,
      offset,
      subQuery: false, // pagination to'g'ri ishlashi uchun muhim
    });

    const data: ClassLeaderboardEntry[] = rows.map(
      (userInstance: any, index: number) => {
        const user = userInstance.get({ plain: true });
        const coins = Number(user.coins || 0);
        const blocked = Number(user.blocked_coins || 0);
        return {
          rank: offset + index + 1,
          id: user.id,
          user_id: user.id,
          fullname: user.fullname,
          username: user.username,
          coins: coins,
          blocked_coins: blocked,
          total_coins: coins + blocked,
          profile_picture: user.profile_picture,
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

  // === Qo'shimcha: Sinfning TOP-3 o'quvchisi (Dashboard uchun juda qulay) ===
  async getClassTop3(classId: number): Promise<ClassLeaderboardEntry[]> {
    const result = await this.getClassLeaderboard(classId, 1, 3);
    return result.data;
  }

  // === YANGI: Umumiy sinflar reytingi (maktab bo'yicha) ===
  async getClassesLeaderboard(): Promise<ClassesLeaderboardEntry[]> {
    const classes = await this.classModel.findAll({
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['fullname'],
        },
        {
          model: User,
          as: 'students',
          where: { role: 'student' },
          attributes: ['coins'],
          required: false,
        },
      ],
    });

    const leaderboard: ClassesLeaderboardEntry[] = classes.map((cls) => {
      const totalCoins = (cls.students || []).reduce(
        (sum, student) => sum + (student.coins || 0),
        0,
      );
      const studentCount = cls.students?.length || 0;

      return {
        rank: 0, // keyinroq aniqlanadi
        class_id: cls.id,
        name: cls.name,
        grade: cls.grade,
        teacher_fullname: cls.teacher?.fullname || 'Tayinlanmagan',
        student_count: studentCount,
        total_coins: totalCoins,
        average_coins: studentCount > 0 ? totalCoins / studentCount : 0,
      };
    });

    // Total coins bo'yicha tartiblaymiz
    return leaderboard
      .sort((a, b) => b.total_coins - a.total_coins)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }
}
