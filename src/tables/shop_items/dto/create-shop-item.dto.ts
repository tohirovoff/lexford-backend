import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateShopItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  price_coins: number;

  @IsOptional()
  @IsString()
  item_type?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'null' || value === '' || value === null || value === undefined) return null;
    return parseInt(value, 10);
  })
  stock?: number | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value === 'true';
    return value;
  })
  @IsBoolean()
  is_active?: boolean;
}
