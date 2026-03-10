import { PartialType } from '@nestjs/mapped-types';
import { CreateCoinBlockDto } from './create-coin_block.dto';

export class UpdateCoinBlockDto extends PartialType(CreateCoinBlockDto) {}
