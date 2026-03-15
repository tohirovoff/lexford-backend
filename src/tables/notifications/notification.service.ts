import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Notification } from './notification.model';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification)
    private readonly notificationModel: typeof Notification,
  ) {}

  async create(data: {
    user_id: number;
    title: string;
    message: string;
    type?: string;
  }) {
    return this.notificationModel.create(data as any);
  }

  async findAllByUserId(user_id: number) {
    return this.notificationModel.findAll({
      where: { user_id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
  }

  async markAsRead(id: number, user_id: number) {
    const notification = await this.notificationModel.findOne({
      where: { id, user_id },
    });
    if (!notification) {
      throw new NotFoundException('Xabarnoma topilmadi');
    }
    notification.is_read = true;
    await notification.save();
    return notification;
  }

  async markAllAsRead(user_id: number) {
    await this.notificationModel.update(
      { is_read: true },
      { where: { user_id, is_read: false } },
    );
    return { success: true };
  }

  async delete(id: number, user_id: number) {
    const deleted = await this.notificationModel.destroy({
      where: { id, user_id },
    });
    if (deleted === 0) {
      throw new NotFoundException('Xabarnoma topilmadi');
    }
    return { success: true };
  }
}
