import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Notification } from './notification.model';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { SharingModule } from 'src/common/sharingModule';
import { AuthModule } from 'src/common/auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Notification]),
    SharingModule,
    AuthModule,
  ],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
