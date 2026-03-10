// src/tables/auction-log/dto/create-auction-log.dto.ts

import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAuctionLogDto {
  @IsInt()
  auction_id: number;

  @IsString()
  @IsNotEmpty()
  action_type: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  performed_by?: number;
}
