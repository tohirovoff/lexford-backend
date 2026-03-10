import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreatePenaltyDto {
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsNumber()
  @IsNotEmpty()
  auction_id: number;

  @IsNumber()
  @IsNotEmpty()
  coin_penalty: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  @IsNotEmpty()
  issued_by: number;
}
