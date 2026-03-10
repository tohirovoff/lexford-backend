import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Auction } from '../auctions/auctions.model';
import { User } from '../user/user.model';

@Table({ tableName: 'auction_logs' })
export class AuctionLog extends Model<AuctionLog> {
  @ForeignKey(() => Auction)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  auction_id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  action_type: string; // masalan: bid_added, bid_cancelled, warning, penalty, item_sold va h.k.

  @Column({
    type: DataType.TEXT,
    allowNull: true, // ba'zi holatlarda qo'shimcha izoh bo'lmasligi mumkin
  })
  description?: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // agar tizim avtomatik yozsa, performed_by bo'lmasligi mumkin
  })
  performed_by?: number;

  @BelongsTo(() => Auction)
  auction: Auction;

  @BelongsTo(() => User)
  user: User;
}
