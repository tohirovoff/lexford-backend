// src/attendance/attendance.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Patch,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendancesService } from './attendance.service';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/role.decorator';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendancesService) {}

  // Davomat yaratish (faqat sinf rahbari!)
  // POST /attendance
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('teacher', 'admin') // Faqat teacher yoki admin
  async create(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user.id;
    console.log('--- DEBUG ATTENDANCE REQUEST ---');
    console.log('User ID from Token:', currentUserId, typeof currentUserId);
    console.log('User Role form Token:', req.user.role);
    console.log('Request Body:', JSON.stringify(createAttendanceDto));
    console.log('Target Class ID:', createAttendanceDto.class_id, typeof createAttendanceDto.class_id);
    console.log('-------------------------------');

    return this.attendanceService.createAttendance(
      createAttendanceDto,
      currentUserId,
    );
  }

  // Bir nechta davomat yaratish (faqat sinf rahbari!)
  @Post('create-many')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  async createMany(
    @Body() createAttendanceDto: CreateAttendanceDto[],
    @Req() req: any,
  ) {
    const currentUserId = req.user.id;
    return this.attendanceService.createMany(
      createAttendanceDto as any,
      currentUserId,
    );
  }

  // Barcha davomatlarni olish (admin yoki monitoring uchun)
  // GET /attendance
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  async findAll() {
    return this.attendanceService.findAll();
  }

  // O'quvchi uchun davomat statistikasini olish
  // GET /attendance/stats/student/15
  @Get('stats/student/:student_id')
  @UseGuards(AuthGuard)
  async getStudentStats(@Param('student_id', ParseIntPipe) student_id: number) {
    return this.attendanceService.getStudentAttendanceStats(student_id);
  }

  // Bugungi sinf davomatini olish (o'qituvchi yoki admin uchun juda qulay!)
  // GET /attendance/class/1/today
  @Get('class/:class_id/today')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  async getTodayAttendance(@Param('class_id', ParseIntPipe) class_id: number) {
    const today = new Date().toISOString().split('T')[0]; // 2025-12-24
    const attendance = await this.attendanceService.findByClassAndDate(
      class_id,
      today,
    );

    if (!attendance) {
      throw new HttpException(
        `${today} kuni ${class_id}-sinf uchun davomat topilmadi`,
        HttpStatus.NOT_FOUND,
      );
    }

    return attendance;
  }

  // Sinfning barcha davomat tarixini olish
  // GET /attendance/class/1
  @Get('class/:class_id')
  @UseGuards(AuthGuard)
  async getClassAttendanceHistory(
    @Param('class_id', ParseIntPipe) class_id: number,
  ) {
    return this.attendanceService.findAllByClass(class_id);
  }

  // Bitta davomatni ID bo'yicha olish
  // GET /attendance/:id
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.findOne(id);
  }

  // Davomatni yangilash (faqat sinf rahbari!)
  // PATCH /attendance/:id
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user.id;
    return this.attendanceService.update(id, updateAttendanceDto, currentUserId);
  }

  // Davomatni o'chirish (faqat sinf rahbari!)
  // DELETE /attendance/:id
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const currentUserId = req.user.id;
    return this.attendanceService.remove(id, currentUserId);
  }
}
