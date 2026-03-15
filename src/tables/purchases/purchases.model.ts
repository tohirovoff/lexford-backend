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
  declare user_id: number;

  @BelongsTo(() => User)
  declare user: User;

  @ForeignKey(() => ShopItem)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare item_id: number;

  @BelongsTo(() => ShopItem, {
    foreignKey: 'item_id',
    as: 'item',
  })
  declare item: ShopItem;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare price_paid: number;

  @Column({
    type: DataType.ENUM('pending', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  })
  declare status: string;
}
