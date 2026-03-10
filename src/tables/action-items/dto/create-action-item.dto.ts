import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateActionItemDto {
  @IsNumber()
  @IsNotEmpty()
  auction_id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty() // agar description majburiy boʻlmasa, @IsOptional() qoʻshing
  description: string;

  @IsString()
  @IsOptional() // rasm boʻlmasa ham boʻlaveradi
  image_url?: string;

  @IsNumber()
  @IsNotEmpty()
  start_price: number;

  @IsNumber()
  @IsNotEmpty()
  min_step: number;

  @IsEnum(['waiting', 'active', 'sold'])
  @IsOptional() // default 'waiting' boʻlgani uchun ixtiyoriy
  status?: 'waiting' | 'active' | 'sold';

  @IsNumber()
  @IsOptional() // yaratishda hali yoʻq
  winner_id?: number;

  @IsNumber()
  @IsOptional() // yaratishda hali yoʻq
  final_price?: number;
}
