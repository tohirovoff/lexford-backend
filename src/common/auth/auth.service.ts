import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/tables/user/dto/create-user.dto';
import { LoginDto } from 'src/tables/user/dto/login.dto';
import { User } from 'src/tables/user/user.model';
import { UserService } from 'src/tables/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;
    const user = await this.userService.userModel.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Noto‘g‘ri username yoki parol');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user?.dataValues.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Noto‘g‘ri username yoki parol');
    }

    const payload = {
      sub: user.id,
      username: user.dataValues.username,
      role: user.dataValues.role,
    };
    console.log(user.dataValues.role);
    const accessToken = this.jwtService.sign(payload, {
      secret: this.userService['configService'].get('JWT_ACCESS_SECRET'),
      expiresIn: '1h',
    });

    const { password: _, ...userWithoutPassword } = user.get({ plain: true });
    
    // Fallback for profile picture
    if (!userWithoutPassword.profile_picture) {
      userWithoutPassword.profile_picture = '/uploads/default-avatar.png';
    }

    return {
      access_token: accessToken,
      user: userWithoutPassword,
    };
  }

  // REGISTER — qo‘lda hash qilamiz
  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.userService.userModel.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new BadRequestException('Bu username allaqachon mavjud');
    }

    if (createUserDto.role === 'student' && createUserDto.coins === undefined) {
      createUserDto.coins = 0;
    }
    if (createUserDto.role !== 'student') {
      createUserDto.coins = undefined;
    }

    // PAROLNI QO‘LDA HASH QILAMIZ
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const { password: _, ...userWithoutPassword } = newUser.get({
      plain: true,
    });

    // Fallback for profile picture
    if (!userWithoutPassword.profile_picture) {
      userWithoutPassword.profile_picture = '/uploads/default-avatar.png';
    }

    return {
      message: 'Foydalanuvchi muvaffaqiyatli ro‘yxatdan o‘tdi',
      user: userWithoutPassword,
    };
  }

  // CREATE MANY — har birini hash qilamiz
  async createMany(createUserDtos: CreateUserDto[]) {
    try {
      const usersToCreate = await Promise.all(
        createUserDtos.map(async (dto) => {
          if (!dto.password) {
            throw new BadRequestException(
              'Har bir foydalanuvchi uchun parol talab qilinadi',
            );
          }

          const hashedPassword = await bcrypt.hash(dto.password, 10);

          return {
            ...dto,
            password: hashedPassword,
            coins: dto.role === 'student' ? (dto.coins ?? 0) : null,
          };
        }),
      );

      const users = await this.userService.userModel.bulkCreate(
        usersToCreate as User[],
        {
          validate: true,
        },
      );

      return users.map((user) => {
        const { password: _, ...safeUser } = user.get({ plain: true });
        return safeUser;
      });
    } catch (err) {
      console.log(err);
      if (err.name === 'SequelizeValidationError') {
        throw new BadRequestException(
          err.errors.map((e) => e.message).join(', '),
        );
      }
      throw new HttpException(
        'Failed to create multiple users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
