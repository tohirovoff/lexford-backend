import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreatePurchaseDto {
  @IsNotEmpty()
  @IsNumber()
  item_id: number;
}
