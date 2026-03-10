import { PartialType } from '@nestjs/mapped-types';
import { CreateAuctionLogDto } from './create-auction_log.dto';

export class UpdateAuctionLogDto extends PartialType(CreateAuctionLogDto) {}
