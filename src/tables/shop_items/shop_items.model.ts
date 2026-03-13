import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { Purchase } from '../purchases/purchases.model';

@Table({ tableName: 'shop_items' })
export class ShopItem extends Model<ShopItem> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  price_coins!: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  item_type?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  image_url?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  stock?: number | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active!: boolean;

  @HasMany(() => Purchase, {
    foreignKey: 'item_id',
    as: 'purchases',
  })
  purchases: Purchase[];
}
