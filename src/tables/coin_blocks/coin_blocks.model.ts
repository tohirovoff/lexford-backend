import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../user/user.model';
import { AuctionItems } from '../action-items/auction-items.model';

@Table({ tableName: 'coin_blocks' })
export class CoinBlock extends Model<CoinBlock> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id: number;

  @ForeignKey(() => AuctionItems)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  auction_item_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  blocked_amount: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user: User;

  @BelongsTo(() => AuctionItems)
  auctionItems: AuctionItems;
}
