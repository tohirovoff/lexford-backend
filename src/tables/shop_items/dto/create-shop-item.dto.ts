export class CreateShopItemDto {
  name: string;
  description?: string;
  price_coins: number;
  item_type?: string;
  image_url?: string;
  stock?: number | null;
  is_active?: boolean;
}
