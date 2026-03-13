import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { ShopItemsService } from './shop_items.service';
import { CreateShopItemDto } from './dto/create-shop-item.dto';
import { UpdateShopItemDto } from './dto/update-shop-item.dto';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/role.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@UseGuards(AuthGuard)
@Controller('shop-items')
export class ShopItemsController {
  constructor(private readonly shopItemsService: ShopItemsService) {}

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    })
  )
  create(@Body() createShopItemDto: CreateShopItemDto, @UploadedFile() file: any) {
    if (file) {
      // Rasmni base64 formatda bazaga saqlaymiz
      const base64 = file.buffer.toString('base64');
      const mimeType = file.mimetype;
      createShopItemDto.image_url = `data:${mimeType};base64,${base64}`;
    }
    return this.shopItemsService.create(createShopItemDto);
  }

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Get('all')
  findAll() {
    return this.shopItemsService.findAll();
  }

  @Get()
  findActive() {
    return this.shopItemsService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shopItemsService.findOne(+id);
  }

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    })
  )
  update(@Param('id') id: string, @Body() updateShopItemDto: UpdateShopItemDto, @UploadedFile() file: any) {
    if (file) {
      // Rasmni base64 formatda bazaga saqlaymiz
      const base64 = file.buffer.toString('base64');
      const mimeType = file.mimetype;
      updateShopItemDto.image_url = `data:${mimeType};base64,${base64}`;
    }
    return this.shopItemsService.update(+id, updateShopItemDto);
  }

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shopItemsService.remove(+id);
  }
}
