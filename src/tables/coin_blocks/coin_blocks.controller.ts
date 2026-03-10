// src/tables/coin-block/coin-blocks.controller.ts

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
import { CoinBlocksService } from './coin_blocks.service';
import { CreateCoinBlockDto } from './dto/create-coin_block.dto';
import { UpdateCoinBlockDto } from './dto/update-coin_block.dto';

@Controller('coin-blocks')
export class CoinBlocksController {
  constructor(private readonly coinBlocksService: CoinBlocksService) {}

  // Yangi coin bloklash qo'shish (stavka vaqtida bloklanadi)
  @Post()
  create(@Body() createCoinBlockDto: CreateCoinBlockDto) {
    return this.coinBlocksService.create(createCoinBlockDto);
  }

  // Test uchun bir nechta bloklash qo'shish
  @Post('create-many')
  createMany(@Body() createCoinBlockDtos: CreateCoinBlockDto[]) {
    return this.coinBlocksService.createMany(createCoinBlockDtos);
  }

  // Barcha coin bloklashlarni olish
  @Get()
  findAll() {
    return this.coinBlocksService.findAll();
  }

  // Bitta bloklashni ID bo'yicha olish
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coinBlocksService.findOne(id);
  }

  // Foydalanuvchi bo'yicha bloklangan coinlarni olish (juda muhim!)
  // Masalan: GET /coin-blocks/user/15
  @Get('user/:user_id')
  findByUserId(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.coinBlocksService.findByUserId(user_id);
  }

  // Bloklashni yangilash (masalan, statusni o'zgartirish: blocked → spent yoki released)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCoinBlockDto: UpdateCoinBlockDto,
  ) {
    return this.coinBlocksService.update(id, updateCoinBlockDto);
  }

  // Bloklashni o'chirish (masalan, refund yoki spent bo'lgandan keyin)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coinBlocksService.remove(id);
  }
}
