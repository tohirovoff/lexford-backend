// src/classes/classes.model.ts (yoki class.model.ts)

import {
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../user/user.model';
import { Attendance } from '../attendance/attendance.model';

@Table({
  tableName: 'classes',
  timestamps: true, // createdAt va updatedAt avtomatik qo'shiladi
})
export class Class extends Model<Class> {
  // Sinf nomi (masalan: "5B", "7A")
  @Column({
    type: DataType.STRING,
    allowNull: false,
    // unique: true, // Bir xil nomli sinf bo'lmasin
  })
  name: string;

  // Sinf darajasi (masalan: "5th Grade", "7-sinf")
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  grade: string;

  // Sinf rahbari (teacher)
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  teacher_id: number;

  // Sinf rahbari ma'lumotlari (fullname, username va h.k.)
  @BelongsTo(() => User, {
    foreignKey: 'teacher_id',
    as: 'teacher', // <--- bu qatorni qo'shing!
  })
  teacher: User;

  // Sinfga tegishli barcha o'quvchilar (student roli bo'lgan userlar)
  @HasMany(() => User, {
    foreignKey: 'class_id',
    as: 'students', // alias qo'shish yaxshi amaliyot
  })
  students: User[];

  // Sinfga tegishli barcha davomatlar
  @HasMany(() => Attendance, {
    foreignKey: 'class_id',
    as: 'attendances',
  })
  attendances: Attendance[];

  // Sinfdagi o'quvchilar soni (cache uchun — tezlikni oshiradi)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  student_count: number;
}
