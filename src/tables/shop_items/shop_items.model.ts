import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { Purchase } from '../purchases/purchases.model';

@Table({ tableName: 'shop_items' })
export class ShopItem extends Model<ShopItem> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare price_coins: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare item_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  declare image_url: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: null,
  })
  declare stock: number | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare is_active: boolean;

  @HasMany(() => Purchase, {
    foreignKey: 'item_id',
    as: 'purchases',
  })
  purchases: Purchase[];
}
