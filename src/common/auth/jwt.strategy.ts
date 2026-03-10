// src/auth/jwt.strategy.ts

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'fallback-secret-for-dev-only',
    });
  }

  async validate(payload: any) {
    // Eski xato tekshirishni BUTUNLAY O'CHIRDIK
    // chunki tokeningizda userId yo'q, faqat sub bor

    // Faqat sub borligini tekshirish yetarli
    if (!payload.sub) {
      throw new UnauthorizedException(
        'Token noto‘g‘ri: foydalanuvchi ID topilmadi',
      );
    }

    // req.user ga kerakli ma'lumotlarni qo'yamiz
    return {
      id: payload.sub, // ← Bu eng muhimi! req.user.id = 1 bo'ladi
      username: payload.username,
      role: payload.role,
    };
  }
}
