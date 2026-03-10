// src/auth/auth.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: number; // <--- ID bu yerda
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Kalit berilmagan');
    }

    try {
      const secret = this.getJwtSecret();
      const payload = jwt.verify(token, secret);

      // Token ichida sub (ID) bo'lishi shart
      if (!payload.sub) {
        throw new UnauthorizedException(
          'Token ichida foydalanuvchi ID topilmadi',
        );
      }

      // request.user ga kerakli ma'lumotlarni qo'yamiz
      request.user = {
        id: Number(payload.sub), // <--- Bu eng muhimi! req.user.id = 1 bo'ladi
        username: (payload as any).username ?? null,
        role: (payload as any).role ?? null,
      };

      return true;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Kalit muddati tugagan');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Kalit noto‘g‘ri');
      }
      throw new UnauthorizedException(
        'Autentifikatsiya xatosi: ' + error.message,
      );
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_ACCESS_SECRET environment variable is not configured',
      );
    }
    return secret;
  }
}
