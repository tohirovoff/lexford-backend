import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Auction } from '../auctions/auctions.model';
import { Bids } from '../bids/bids.model';
import { User } from '../user/user.model';
import { CoinBlock } from '../coin_blocks/coin_blocks.model';

@Table({ tableName: 'auction_items' }) // tableName odatda snake_case
export class AuctionItems extends Model<AuctionItems> {
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
  name: string;

  @Column({
    type: DataType.TEXT, // description uzun boʻlishi mumkin, TEXT yaxshiroq
    allowNull: true, // agar majburiy boʻlmasa, true qilish mumkin
  })
  description: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true, // rasm boʻlmasa ham boʻlaveradi
  })
  image_url: string | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  start_price: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  min_step: number;

  @Column({
    type: DataType.ENUM('waiting', 'active', 'sold'),
    allowNull: false,
    defaultValue: 'waiting',
  })
  status: 'waiting' | 'active' | 'sold';

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true, // <-- Muhim: true boʻlishi kerak
  })
  winner_id: number | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true, // <-- Muhim: true boʻlishi kerak
    defaultValue: null,
  })
  final_price: number | null;

  @BelongsTo(() => Auction)
  auction: Auction;

  @HasMany(() => Bids)
  bids: Bids[];

  @BelongsTo(() => User)
  user: User;

  @HasMany(() => CoinBlock)
  coinBlocks: CoinBlock[];
}
