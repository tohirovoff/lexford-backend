// src/attendances/attendances.service.ts

import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Attendance } from './attendance.model';
import { CoinTransactionsService } from '../coin_transactions/coin_transactions.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { User } from '../user/user.model';
import { Class } from '../classes/classes.model';
import { Op } from 'sequelize';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectModel(Attendance)
    private attendanceModel: typeof Attendance,
    @InjectModel(Class)
    private classModel: typeof Class,
    @InjectModel(User)
    private userModel: typeof User,
    private coinTransactionsService: CoinTransactionsService,
    private sequelize: Sequelize,
  ) {}

  /**
   * Sinf rahbari ekanligini tekshirish
   * @param classId - sinf ID si
   * @param teacherId - o'qituvchi (so'rov yuborayotgan user) ID si
   */
  private async verifyClassTeacher(
    classId: number,
    teacherId: number,
  ): Promise<Class> {
    const classItem = await this.classModel.findByPk(classId);

    if (!classItem) {
      throw new NotFoundException(`ID: ${classId} bo'lgan sinf topilmadi`);
    }

    // Admin bo'lsa tekshirmaslik (debug/monitoring uchun)
    const requestUser = await this.userModel.findByPk(teacherId);
    console.log('--- DEBUG ADMIN CHECK ---');
    console.log('teacherId param:', teacherId, typeof teacherId);
    console.log('requestUser found:', !!requestUser);
    console.log('requestUser role:', requestUser?.role);
    console.log('Is admin?', requestUser?.role === 'admin');
    console.log('-------------------------');
    if (requestUser && requestUser.role === 'admin') {
      console.log('ADMIN DETECTED - skipping teacher check');
      return classItem;
    }

    // Sinf va o'qituvchi ID sini aniq olish
    const actualTeacherId = classItem.teacher_id !== undefined 
      ? classItem.teacher_id 
      : classItem.getDataValue ? classItem.getDataValue('teacher_id') : undefined;
    
    console.log('--- DEBUG TEACHER CHECK ---');
    console.log(`Request Info: Class ID: ${classId}, Request User ID: ${teacherId}`);
    try {
      console.log('Class Item Full JSON:', JSON.stringify(classItem.toJSON()));
    } catch (e) {
      console.log('Class Item (Not JSON):', classItem);
    }
    console.log('Teacher ID (prop):', classItem.teacher_id);
    console.log('Actual extracted Teacher ID:', actualTeacherId);
    console.log('---------------------------');

    // Agar teacher_id baribir topilmasa, bu model yoki DB xatosi
    if (actualTeacherId === undefined) {
      console.error('CRITICAL ERROR: Class model returns undefined teacher_id!');
      // Xatolik sababini ko'rsatish uchun ham logda qoldiramiz, lekin exception otamiz
    }

    // Type conversion to ensure safe comparison
    if (Number(actualTeacherId) !== Number(teacherId)) {
      throw new ForbiddenException(
        `XATO: Siz (ID: ${teacherId}) bu sinf (ID: ${classId}) davomatini olish huquqiga ega emassiz. Bu sinf rahbari ID: ${actualTeacherId}. Iltimos, o'zingizga tegishli sinfni tanlang yoki admin bilan bog'laning.`,
      );
    }

    return classItem;
  }

  /**
   * Sinfga tegishli barcha o'quvchilar ID larini olish
   */
  private async getClassStudentIds(classId: number): Promise<number[]> {
    const students = await this.userModel.findAll({
      where: { class_id: classId, role: 'student' },
      attributes: ['id'],
      raw: true,
    });
    return students.map((s: any) => s.id);
  }

  // Davomat yaratish (POST /attendance)
  async createAttendance(dto: CreateAttendanceDto, currentUserId: number) {
    try {
      return await this.sequelize.transaction(async (t) => {
        // 1. Sinf rahbari ekanligini tekshirish
        await this.verifyClassTeacher(dto.class_id, currentUserId);

        // 2. Duplicate oldini olish
        const existing = await this.attendanceModel.findOne({
          where: { class_id: dto.class_id, date: dto.date },
          transaction: t,
        });

        if (existing) {
          throw new HttpException(
            `Bu sinf uchun ${dto.date} kuni davomat allaqachon olingan!`,
            HttpStatus.CONFLICT,
          );
        }

        // 3. Sinf o'quvchilarini olish
        const allStudentIds = await this.getClassStudentIds(dto.class_id);

        // 4. Kelgan, kechikkan va kelmagan o'quvchilarni aniqlash
        const presentIds = dto.present_student_ids || [];
        const lateIds = dto.late_student_ids || [];

        // Kelmagan o'quvchilar = Jami - Kelgan - Kechikkan
        const presentAndLateSet = new Set([...presentIds, ...lateIds]);
        const absentIds = allStudentIds.filter(
          (id) => !presentAndLateSet.has(id),
        );

        // 5. Davomat ma'lumotlarini tayyorlash
        const attendanceData = {
          class_id: dto.class_id,
          teacher_id: currentUserId, // So'rov yuborayotgan user = sinf rahbari
          date: dto.date,
          subject: dto.subject ?? null,
          present_student_ids: presentIds,
          late_student_ids: lateIds,
        };

        const attendance = await this.attendanceModel.create(
          attendanceData as any,
          {
            transaction: t,
          },
        );

        // 6. Coin tranzaksiyalari:
        // - Kelgan o'quvchilarga +5 coin
        // - Kechikkan o'quvchilarga 0 coin (hech narsa qilmaymiz)
        // - Kelmagan o'quvchilardan -5 coin

        // Kelgan o'quvchilarga +5 coin
        if (presentIds.length > 0) {
          const presentCoinPromises = presentIds.map((student_id) =>
            this.coinTransactionsService.create(
              {
                user_id: student_id,
                amount: 5,
                type: 'reward',
                reason: `Davomat: ${dto.date} kuni darsga kelgani uchun (+5 coin)`,
                created_by: currentUserId,
              },
              t,
            ),
          );
          await Promise.all(presentCoinPromises);
        }

        // Kelmagan o'quvchilardan -5 coin
        if (absentIds.length > 0) {
          const absentCoinPromises = absentIds.map((student_id) =>
            this.coinTransactionsService.create(
              {
                user_id: student_id,
                amount: -5,
                type: 'penalty',
                reason: `Davomat: ${dto.date} kuni darsga kelmagani uchun (-5 coin)`,
                created_by: currentUserId,
              },
              t,
            ),
          );
          await Promise.all(absentCoinPromises);
        }

        // Kechikkan o'quvchilarga hech narsa qilmaymiz (0 coin)

        return {
          ...attendance.toJSON(),
          stats: {
            present_count: presentIds.length,
            late_count: lateIds.length,
            absent_count: absentIds.length,
            total_students: allStudentIds.length,
          },
        };
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;

      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new HttpException(
          `Bu sinf uchun ${dto.date} kuni davomat allaqachon mavjud!`,
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        'Davomat yaratishda xatolik yuz berdi: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createMany(dto: CreateAttendanceDto[], currentUserId: number) {
    try {
      return await this.sequelize.transaction(async (t) => {
        const results: Attendance[] = [];

        for (const item of dto) {
          // Har bir sinf uchun rahbarlikni tekshirish
          await this.verifyClassTeacher(item.class_id, currentUserId);

          // Sinf o'quvchilarini olish
          const allStudentIds = await this.getClassStudentIds(item.class_id);

          const presentIds = item.present_student_ids || [];
          const lateIds = item.late_student_ids || [];
          const presentAndLateSet = new Set([...presentIds, ...lateIds]);
          const absentIds = allStudentIds.filter(
            (id) => !presentAndLateSet.has(id),
          );

          const attendance = await this.attendanceModel.create(
            {
              class_id: item.class_id,
              teacher_id: currentUserId,
              date: item.date,
              subject: item.subject ?? null,
              present_student_ids: presentIds,
              late_student_ids: lateIds,
            } as any,
            { transaction: t },
          );

          // Kelgan o'quvchilarga +5 coin
          if (presentIds.length > 0) {
            const presentPromises = presentIds.map((student_id) =>
              this.coinTransactionsService.create(
                {
                  user_id: student_id,
                  amount: 5,
                  type: 'reward',
                  reason: `Davomat: ${item.date} kuni darsga kelgani uchun (+5 coin)`,
                  created_by: currentUserId,
                },
                t,
              ),
            );
            await Promise.all(presentPromises);
          }

          // Kelmagan o'quvchilardan -5 coin
          if (absentIds.length > 0) {
            const absentPromises = absentIds.map((student_id) =>
              this.coinTransactionsService.create(
                {
                  user_id: student_id,
                  amount: -5,
                  type: 'penalty',
                  reason: `Davomat: ${item.date} kuni darsga kelmagani uchun (-5 coin)`,
                  created_by: currentUserId,
                },
                t,
              ),
            );
            await Promise.all(absentPromises);
          }

          results.push(attendance);
        }

        return results;
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Koʻp davomat yaratishda xatolik yuz berdi',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha davomatlarni olish (GET /attendance)
  async findAll() {
    return this.attendanceModel.findAll({
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'fullname', 'username'],
        },
        { model: User },
      ],
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  // Bitta davomatni ID bo'yicha olish (GET /attendance/:id)
  async findOne(id: number) {
    const attendance = await this.attendanceModel.findByPk(id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'fullname', 'username'],
        },
        { model: User },
      ],
    });

    if (!attendance) {
      throw new NotFoundException(`ID: ${id} bo'lgan davomat topilmadi`);
    }

    return attendance;
  }

  // Bugungi sinf davomatini olish (GET /attendance/class/:class_id/today)
  async findByClassAndDate(class_id: number, date: string) {
    return this.attendanceModel.findOne({
      where: { class_id, date },
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'fullname', 'username'],
        },
        { model: User },
      ],
    });
  }

  // Sinfning barcha davomat tarixini olish (GET /attendance/class/:class_id)
  async findAllByClass(class_id: number) {
    return this.attendanceModel.findAll({
      where: { class_id },
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'fullname', 'username'],
        },
      ],
      order: [['date', 'DESC']],
    });
  }

  // O'quvchi statistikasini olish (GET /attendance/stats/student/:student_id)
  async getStudentAttendanceStats(student_id: number) {
    // Kelgan kunlar
    const presentAttendances = await this.attendanceModel.findAll({
      attributes: ['date'],
      where: {
        present_student_ids: {
          [Op.contains]: [student_id],
        },
      },
      order: [['date', 'DESC']],
      raw: true,
    });

    // Kechikkan kunlar
    const lateAttendances = await this.attendanceModel.findAll({
      attributes: ['date'],
      where: {
        late_student_ids: {
          [Op.contains]: [student_id],
        },
      },
      order: [['date', 'DESC']],
      raw: true,
    });

    const totalDaysPresent = presentAttendances.length;
    const totalDaysLate = lateAttendances.length;
    const coinsFromAttendance = totalDaysPresent * 5; // Faqat kelganlar uchun
    const totalBalance =
      await this.coinTransactionsService.getUserBalance(student_id);

    return {
      student_id,
      total_days_present: totalDaysPresent,
      total_days_attended: totalDaysPresent, // Frontend uchun eski nomni saqlab qolamiz
      total_days_late: totalDaysLate,
      coins_from_attendance: coinsFromAttendance,
      total_coins: totalBalance,
      recent_attendances: presentAttendances
        .slice(0, 10)
        .map((row: any) => row.date),
      recent_late_days: lateAttendances
        .slice(0, 10)
        .map((row: any) => row.date),
    };
  }

  // Davomatni yangilash (PATCH /attendance/:id)
  async update(id: number, dto: UpdateAttendanceDto, currentUserId: number) {
    const attendance = await this.findOne(id);

    // Sinf rahbari tekshiruvi
    await this.verifyClassTeacher(attendance.class_id, currentUserId);

    const updatedData: Partial<Attendance> = {
      ...(dto.class_id && { class_id: dto.class_id }),
      ...(dto.teacher_id && { teacher_id: dto.teacher_id }),
      ...(dto.date && { date: dto.date }),
      ...(dto.subject !== undefined && { subject: dto.subject ?? null }),
      ...(dto.present_student_ids && {
        present_student_ids: dto.present_student_ids,
      }),
      ...(dto.late_student_ids && {
        late_student_ids: dto.late_student_ids,
      }),
    };

    await attendance.update(updatedData);

    return attendance.reload();
  }

  // Davomatni o'chirish (DELETE /attendance/:id)
  async remove(id: number, currentUserId: number) {
    const attendance = await this.findOne(id);

    // Sinf rahbari tekshiruvi
    await this.verifyClassTeacher(attendance.class_id, currentUserId);

    await attendance.destroy();

    return { message: "Davomat muvaffaqiyatli o'chirildi" };
  }
}
