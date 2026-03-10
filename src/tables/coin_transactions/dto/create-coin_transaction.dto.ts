import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCoinTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  created_by: number;
}
