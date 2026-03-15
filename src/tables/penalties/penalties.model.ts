import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../user/user.model';
import { Auction } from '../auctions/auctions.model';

@Table({ tableName: 'penalties' })
export class Penalties extends Model<Penalties> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_id: number;

  @ForeignKey(() => Auction)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare auction_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare coin_penalty: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: 'Intizomsizlik',
  })
  declare reason: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare issued_by: number;

  // Jarima olgan o'quvchi
  @BelongsTo(() => User, {
    foreignKey: 'user_id',
    as: 'receiver',
  })
  receiver: User;

  // Jarima bergan moderator
  @BelongsTo(() => User, {
    foreignKey: 'issued_by',
    as: 'issuer',
  })
  issuer: User;

  @BelongsTo(() => Auction)
  auction: Auction;
}
