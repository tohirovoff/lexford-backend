import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateBidDto {
  @IsNumber()
  @IsNotEmpty()
  auction_item_id: number;

  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsNumber()
  @IsNotEmpty()
  bid_amount: number;

  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}
