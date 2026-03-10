// src/tables/bid/bids.controller.ts (papka tuzilishingizga moslashtiring)

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Put,
} from '@nestjs/common';
import { BidsService } from './bids.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';

@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  // Yangi stavka qo'shish
  @Post()
  create(@Body() createBidDto: CreateBidDto) {
    return this.bidsService.create(createBidDto);
  }

  // Bir nechta stavka birda qo'shish (test uchun foydali)
  @Post('create-many')
  createMany(@Body() createBidDtos: CreateBidDto[]) {
    return this.bidsService.createMany(createBidDtos);
  }

  // Barcha stavkalarni olish
  @Get()
  findAll() {
    return this.bidsService.findAll();
  }

  // Bitta stavkani ID bo'yicha olish
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bidsService.findOne(id);
  }

  // Ma'lum bir mahsulot uchun barcha stavkalarni olish
  // Masalan: GET /bids/item/5
  @Get('item/:auction_item_id')
  findByAuctionItemId(
    @Param('auction_item_id', ParseIntPipe) auction_item_id: number,
  ) {
    return this.bidsService.findByAuctionItemId(auction_item_id);
  }

  // Ma'lum bir mahsulot uchun hozirgi eng yuqori stavkani olish
  // Masalan: GET /bids/highest?auction_item_id=5
  @Get('highest')
  async getCurrentHighestBid(
    @Query('auction_item_id', ParseIntPipe) auction_item_id: number,
  ) {
    return this.bidsService.getCurrentHighestBid(auction_item_id);
  }

  // Stavkani yangilash (masalan, is_active o'zgartirish yoki admin tuzatishi uchun)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBidDto: UpdateBidDto,
  ) {
    return this.bidsService.update(id, updateBidDto);
  }

  // Stavkani o'chirish (ehtiyotkorlik bilan ishlatiladi)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bidsService.remove(id);
  }
}
