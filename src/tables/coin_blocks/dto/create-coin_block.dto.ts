import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCoinBlockDto {
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsNumber()
  @IsNotEmpty()
  auction_item_id: number;

  @IsNumber()
  @IsNotEmpty()
  blocked_amount: number;

  @IsString()
  @IsNotEmpty()
  status: string;
}
