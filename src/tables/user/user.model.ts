// src/user/user.model.ts

import {
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Penalties } from '../penalties/penalties.model';
import { Bids } from '../bids/bids.model';
import { CoinTransactions } from '../coin_transactions/coin_transactions.model';
import { CoinBlock } from '../coin_blocks/coin_blocks.model';
import { AuctionLog } from '../auction_logs/auction_logs.model';
import { Attendance } from '../attendance/attendance.model';
import { Class } from '../classes/classes.model';
import { AuctionItems } from '../action-items/auction-items.model';
import { Purchase } from '../purchases/purchases.model';

@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare username: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare password: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare fullname: string;

  @Column({
    type: DataType.ENUM('teacher', 'admin', 'student'),
    allowNull: false,
  })
  declare role: 'teacher' | 'admin' | 'student';

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
  })
  declare coins: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare profile_picture: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare bio: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare class_name: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare grade: string | null;

  @ForeignKey(() => Class)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare class_id: number | null;

  // User → Class bog'lanishi (BelongsTo)
  @BelongsTo(() => Class)
  class: Class;

  @HasMany(() => Penalties, {
    foreignKey: 'user_id',
    as: 'receivedPenalties',
  })
  receivedPenalties: Penalties[];

  @HasMany(() => Penalties, {
    foreignKey: 'issued_by',
    as: 'issuedPenalties',
  })
  issuedPenalties: Penalties[];

  @HasMany(() => Bids)
  stavkalar: Bids[];

  @HasMany(() => AuctionItems)
  auctionItems: AuctionItems[];

  @HasMany(() => CoinTransactions, {
    foreignKey: 'user_id',
    as: 'receivedTransactions',
  })
  receivedTransactions: CoinTransactions[];

  @HasMany(() => CoinTransactions, {
    foreignKey: 'created_by',
    as: 'givenTransactions',
  })
  givenTransactions: CoinTransactions[];

  @HasMany(() => CoinBlock)
  coinBlocks: CoinBlock[];

  @HasMany(() => AuctionLog)
  auctionLogs: AuctionLog[];

  @HasMany(() => Attendance, 'teacher_id')
  givenAttendances: Attendance[]; // O'qituvchi olgan davomatlar

  @HasMany(() => Class, 'teacher_id')
  managedClasses: Class[]; // Teacher qaysi sinflarning rahbari

  @HasMany(() => Purchase)
  purchases: Purchase[];
}
