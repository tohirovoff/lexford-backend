import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../user/user.model';

@Table({ 
  tableName: 'coin_transactions',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['created_by'] },
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['createdAt'] },
    { fields: ['user_id', 'status', 'createdAt'], name: 'idx_user_status_date' },
    { fields: ['created_by', 'createdAt'], name: 'idx_creator_date' },
  ]
})
export class CoinTransactions extends Model<CoinTransactions> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  type: string; // masalan: 'reward', 'penalty', 'purchase' va h.k.

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  reason: string;

  @Column({
    type: DataType.STRING,
    defaultValue: 'approved',
  })
  status: string;


  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // admin yoki teacher tomonidan berilgan bo‘lishi mumkin, sistemaviy bo‘lsa null
  })
  created_by: number;

  @BelongsTo(() => User, { foreignKey: 'user_id', as: 'receiver', onDelete: 'CASCADE' })
  receiver: User;

  @BelongsTo(() => User, { foreignKey: 'created_by', as: 'giver', onDelete: 'CASCADE' })
  giver: User;
}
