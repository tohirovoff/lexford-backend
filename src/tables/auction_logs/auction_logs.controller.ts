// src/tables/auction-log/auction-logs.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { AuctionLogsService } from './auction_logs.service';
import { CreateAuctionLogDto } from './dto/create-auction_log.dto';
import { UpdateAuctionLogDto } from './dto/update-auction_log.dto';

@Controller('auction-logs') // plural va snake_case – NestJS konventsiyasi
export class AuctionLogsController {
  constructor(private readonly auctionLogsService: AuctionLogsService) {}

  // Yangi log qo'shish
  @Post()
  create(@Body() createAuctionLogDto: CreateAuctionLogDto) {
    return this.auctionLogsService.create(createAuctionLogDto);
  }

  // Bir nechta log birda qo'shish (test yoki seeding uchun)
  @Post('create-many')
  createMany(@Body() createAuctionLogDtos: CreateAuctionLogDto[]) {
    return this.auctionLogsService.createMany(createAuctionLogDtos);
  }

  // Barcha loglarni olish
  @Get()
  findAll() {
    return this.auctionLogsService.findAll();
  }

  // Bitta logni ID bo'yicha olish
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auctionLogsService.findOne(id);
  }

  // Ma'lum auksion bo'yicha barcha loglarni olish
  // Masalan: GET /auction-logs/auction/12
  @Get('auction/:auction_id')
  findByAuctionId(@Param('auction_id', ParseIntPipe) auction_id: number) {
    return this.auctionLogsService.findByAuctionId(auction_id);
  }

  // Ma'lum action_type bo'yicha loglarni olish (ixtiyoriy, foydali)
  // Masalan: GET /auction-logs/type/penalty
  @Get('type/:action_type')
  findByActionType(@Param('action_type') action_type: string) {
    return this.auctionLogsService.findByActionType(action_type);
  }

  // Logni yangilash (masalan, description tuzatish – kam ishlatiladi)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAuctionLogDto: UpdateAuctionLogDto,
  ) {
    return this.auctionLogsService.update(id, updateAuctionLogDto);
  }

  // Logni o'chirish (ehtiyotkorlik bilan – odatda log o'chirilmaydi)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.auctionLogsService.remove(id);
  }
}
