import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/role.decorator';

@UseGuards(AuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(@Req() req: any, @Body() createPurchaseDto: CreatePurchaseDto) {
    return this.purchasesService.create(req.user.id, createPurchaseDto);
  }

  @Get('my')
  findMyPurchases(@Req() req: any) {
    return this.purchasesService.findByUser(req.user.id);
  }

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Get('all')
  findAll() {
    return this.purchasesService.findAll();
  }
}
