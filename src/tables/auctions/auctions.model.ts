import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { Penalties } from '../penalties/penalties.model';
import { AuctionLog } from '../auction_logs/auction_logs.model';
import { AuctionItems } from '../action-items/auction-items.model';

@Table({ tableName: 'auctions' })
export class Auction extends Model<Auction> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  title: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  start_date: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  end_date: Date;

  @Column({
    type: DataType.ENUM('planned', 'active', 'finished'),
    allowNull: false,
  })
  status: 'planned' | 'active' | 'finished';

  @HasMany(() => Penalties)
  penalties: Penalties[];

  @HasMany(() => AuctionLog)
  auction_logs: AuctionLog[];

  @HasMany(() => AuctionItems)
  auction_items: AuctionItems[];
}
