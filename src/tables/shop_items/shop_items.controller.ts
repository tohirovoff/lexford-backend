import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { ShopItemsService } from './shop_items.service';
import { CreateShopItemDto } from './dto/create-shop-item.dto';
import { UpdateShopItemDto } from './dto/update-shop-item.dto';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/role.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Using standard auth logic, assumed similar to auctions
@UseGuards(AuthGuard)
@Controller('shop-items')
export class ShopItemsController {
  constructor(private readonly shopItemsService: ShopItemsService) {}

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `shop-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    })
  )
  create(@Body() createShopItemDto: CreateShopItemDto, @UploadedFile() file: any) {
    if (file) {
      createShopItemDto.image_url = `/uploads/${file.filename}`;
    }
    // Handle form data parsing 
    if (typeof createShopItemDto.price_coins === 'string') {
        createShopItemDto.price_coins = parseInt(createShopItemDto.price_coins, 10);
    }
    if (createShopItemDto.stock && typeof createShopItemDto.stock === 'string') {
        createShopItemDto.stock = parseInt(createShopItemDto.stock, 10);
    }
    if (createShopItemDto.is_active && typeof createShopItemDto.is_active === 'string') {
        createShopItemDto.is_active = createShopItemDto.is_active === 'true';
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
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `shop-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    })
  )
  update(@Param('id') id: string, @Body() updateShopItemDto: UpdateShopItemDto, @UploadedFile() file: any) {
    if (file) {
      updateShopItemDto.image_url = `/uploads/${file.filename}`;
    }
    // Handle form data parsing 
    if (typeof updateShopItemDto.price_coins === 'string') {
        updateShopItemDto.price_coins = parseInt(updateShopItemDto.price_coins, 10);
    }
    if (updateShopItemDto.stock && typeof updateShopItemDto.stock === 'string') {
        updateShopItemDto.stock = parseInt(updateShopItemDto.stock, 10);
    }
    if (updateShopItemDto.is_active && typeof updateShopItemDto.is_active === 'string') {
        updateShopItemDto.is_active = updateShopItemDto.is_active === 'true';
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
