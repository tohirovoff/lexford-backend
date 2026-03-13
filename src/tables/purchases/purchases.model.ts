import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../user/user.model';
import { ShopItem } from '../shop_items/shop_items.model';

@Table({ tableName: 'purchases' })
export class Purchase extends Model<Purchase> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  user_id!: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => ShopItem)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  item_id!: number;

  @BelongsTo(() => ShopItem, {
    foreignKey: 'item_id',
    as: 'item',
  })
  item: ShopItem;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  price_paid!: number;

  @Column({
    type: DataType.ENUM('pending', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status!: string;
}
