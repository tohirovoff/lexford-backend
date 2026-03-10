import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateAuctionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  start_date: Date;

  @IsDateString()
  @IsNotEmpty()
  end_date: Date;

  @IsEnum(['planned', 'active', 'finished'])
  @IsNotEmpty()
  status: 'planned' | 'active' | 'finished';
}
