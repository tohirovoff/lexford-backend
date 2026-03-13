import { Controller, Get, Post, Body, UseGuards, Req, Patch, Param, Delete } from '@nestjs/common';
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

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.purchasesService.updateStatus(+id, status);
  }

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchasesService.remove(+id);
  }
}
