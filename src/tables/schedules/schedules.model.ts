import {
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  Model,
  Table,
} from 'sequelize-typescript';
import { Class } from '../classes/classes.model';

@Table({
  tableName: 'schedules',
  timestamps: true,
})
export class Schedule extends Model<Schedule> {
  @ForeignKey(() => Class)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    unique: true, // Bir sinfga bitta dars jadvali
  })
  declare class_id: number;

  @BelongsTo(() => Class)
  declare class: Class;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  declare data: any; // Haftalik dars jadvali massivi
}
