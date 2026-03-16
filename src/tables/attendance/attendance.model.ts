// src/attendances/attendance.model.ts

import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
  Unique,
  Index,
} from 'sequelize-typescript';
import { User } from '../user/user.model';
import { Class } from '../classes/classes.model';

@Table({
  tableName: 'attendances',
  indexes: [
    {
      unique: true,
      fields: ['class_id', 'date'], // Bir sinf + bir kun = faqat 1 davomat!
    },
  ],
})
export class Attendance extends Model<Attendance> {
  @ForeignKey(() => Class)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  class_id: number;

  @BelongsTo(() => Class)
  class: Class;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  teacher_id: number;

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  teacher: User;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  date: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  subject: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
  })
  present_student_ids: number[];

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
  })
  late_student_ids: number[];
}
