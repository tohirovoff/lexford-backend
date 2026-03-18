// src/tables/coin-transaction/coin-transactions.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CoinTransactionsService } from './coin_transactions.service';
import { CreateCoinTransactionDto } from './dto/create-coin_transaction.dto';
import { UpdateCoinTransactionDto } from './dto/update-coin_transaction.dto';

@Controller('coin-transactions')
export class CoinTransactionsController {
  constructor(
    private readonly coinTransactionsService: CoinTransactionsService,
  ) {}

  // Yangi coin tranzaksiyasi qo'shish (+5, -5, auksion sarfi va h.k.)
  @Post()
  create(@Body() createCoinTransactionDto: CreateCoinTransactionDto) {
    return this.coinTransactionsService.create(createCoinTransactionDto);
  }

  // Test uchun bir nechta tranzaksiya qo'shish
  @Post('create-many')
  createMany(@Body() createCoinTransactionDtos: CreateCoinTransactionDto[]) {
    return this.coinTransactionsService.createMany(createCoinTransactionDtos);
  }

  // Barcha tranzaksiyalarni olish (ehtiyot bo'ling – ko'p ma'lumot bo'lishi mumkin)
  @Get()
  findAll() {
    return this.coinTransactionsService.findAll();
  }

  // === YANGI: Haftalik top 10 tanga ko'paygan talabalar ===
  @Get('weekly-top-gainers')
  async getWeeklyTopGainers() {
    return this.coinTransactionsService.getWeeklyTopGainers(10);
  }

  // === YANGI: Foydalanuvchining haftalik o'zgarishi ===
  @Get('weekly-change/:user_id')
  async getWeeklyChange(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.coinTransactionsService.getWeeklyChange(user_id);
  }

  // Bitta tranzaksiyani ID bo'yicha olish
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coinTransactionsService.findOne(id);
  }

  // Foydalanuvchi bo'yicha barcha tranzaksiyalarni olish (eng muhim endpoint!)
  // URL: GET /coin-transactions/user/15
  @Get('user/:user_id')
  findByUserId(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.coinTransactionsService.findByUserId(user_id);
  }

  // Alternative: query orqali foydalanuvchi tranzaksiyalarini olish
  // URL: GET /coin-transactions/by-user?user_id=15
  @Get('by-user')
  findByUserQuery(@Query('user_id', ParseIntPipe) user_id: number) {
    return this.coinTransactionsService.findByUserId(user_id);
  }

  // Ma'lum turdagi tranzaksiyalarni olish (reward, penalty, auction_spent va h.k.)
  // URL: GET /coin-transactions/type/reward
  @Get('type/:type')
  findByType(@Param('type') type: string) {
    return this.coinTransactionsService.findByType(type);
  }

  // Foydalanuvchining joriy coin balansini olish (juda muhim endpoint!)
  // URL: GET /coin-transactions/balance/15
  @Get('balance/:user_id')
  async getUserBalance(@Param('user_id', ParseIntPipe) user_id: number) {
    const balance = await this.coinTransactionsService.getUserBalance(user_id);

    return {
      user_id,
      balance,
    };
  }

  // Tranzaksiyani yangilash (masalan, reason yoki boshqa maydonlarni tuzatish)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCoinTransactionDto: UpdateCoinTransactionDto,
  ) {
    return this.coinTransactionsService.update(id, updateCoinTransactionDto);
  }

  // Tranzaksiyani o'chirish (tarixni saqlash uchun kam ishlatish tavsiya etiladi)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coinTransactionsService.remove(id);
  }
}
