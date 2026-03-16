import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { AuctionItems } from '../action-items/auction-items.model';
import { User } from '../user/user.model';

@Table({ tableName: 'bids' })
export class Bids extends Model<Bids> {
  @ForeignKey(() => AuctionItems)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  auction_item_id: number;

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
  bid_amount: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
  })
  is_active: boolean;

  @BelongsTo(() => AuctionItems)
  auction_item = AuctionItems;

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user: User;
}
