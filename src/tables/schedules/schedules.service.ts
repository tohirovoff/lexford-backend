import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Schedule } from './schedules.model';
import { Class } from '../classes/classes.model';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(Schedule)
    private readonly scheduleModel: typeof Schedule,
    @InjectModel(Class)
    private readonly classModel: typeof Class,
  ) {}

  async createOrUpdate(class_id: number, data: any) {
    const classExists = await this.classModel.findByPk(class_id);
    if (!classExists) {
      throw new BadRequestException('Sinf topilmadi');
    }

    let schedule = await this.scheduleModel.findOne({ where: { class_id } });
    if (schedule) {
      schedule.data = data;
      return await schedule.save();
    } else {
      return await this.scheduleModel.create({ class_id, data } as any);
    }
  }

  async findByClass(class_id: number) {
    return await this.scheduleModel.findOne({ where: { class_id } });
  }

  async findAll() {
    return await this.scheduleModel.findAll({ include: [Class] });
  }
}
