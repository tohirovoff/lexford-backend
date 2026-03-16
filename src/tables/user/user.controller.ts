import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Put,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto'; 
import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles } from 'src/common/auth/role.decorator';
import { RolesGuard } from 'src/common/auth/role.guard';
import { AuthGuard } from 'src/common/auth/auth.guard'; // sizning guard
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { Express } from 'multer';
import { AuthService } from 'src/common/auth/auth.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  // Register
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Post('create-many')
  async createMany(@Body() createUserDto: CreateUserDto[]) {
    return this.authService.createMany(createUserDto);
  }

  // Login — to‘g‘ri
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Bitta user (admin yoki o‘zi ko‘rishi mumkin)
  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard) // Avval autentifikatsiya, keyin rol
  @Get('getAll')
  async findAll() {
    const users = await this.userService.findAll();
    return users.map((user) => {
      const { password, ...userWithoutPassword } = user.get({ plain: true });
      return userWithoutPassword;
    });
  }

  // Hozirgi foydalanuvchi ma’lumotlari
  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    const user = await this.userService.getMe(req.user.id);
    const { password: _, ...userWithoutPassword } = user.get({ plain: true });
    // Let frontend handle the fallback icon
    return userWithoutPassword;
  }

  @Get('leaderboard/school')
  async getSchoolLeaderboard(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.userService.getSchoolLeaderboard(page, limit);
  }

  @Get('leaderboard/school/top10')
  async getSchoolTop10() {
    return this.userService.getSchoolTop10();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findOne(id);
    const { password, ...userWithoutPassword } = user.get({ plain: true });
    return userWithoutPassword;
  }

  @Patch('bulk-update')
  async bulkUpdate(
    @Body()
    body: Array<{
      username?: string;
      id?: number;
      data: Partial<UpdateUserDto>;
    }>,
  ) {
    return this.userService.bulkUpdate(body);
  }

  // Profil yangilash (faqat o‘zi)
  @UseGuards(AuthGuard)
  @Put(':id')
  @UseInterceptors(
    FileInterceptor('profile_picture', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `user-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(
            new BadRequestException('Faqat rasm fayllari ruxsat etilgan!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async update(
    @Param('id') id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const targetId = Number(id);
    if (userId !== targetId) {
      throw new ForbiddenException(
        'Faqat o‘z profilingizni yangilashingiz mumkin',
      );
    }

    const updateData: Partial<UpdateUserDto> = { ...updateUserDto };

    if (file) {
      updateData.profile_picture = `/uploads/${file.filename}`;
    }

    return this.userService.update(targetId, updateData);
  }
  
  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Patch(':id/class')
  async updateClass(
    @Param('id', ParseIntPipe) id: number,
    @Body('class_id') class_id: any,
  ) {
    const classId = class_id === 'none' || class_id === null ? null : Number(class_id);
    return this.userService.updateClass(id, classId);
  }

  // O‘chirish (faqat admin)
  @Roles('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(Number(id));
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}
