import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { ShopItemsService } from './shop_items.service';
import { CreateShopItemDto } from './dto/create-shop-item.dto';
import { UpdateShopItemDto } from './dto/update-shop-item.dto';
import { AuthGuard } from '../../common/auth/auth.guard';
import { RolesGuard } from '../../common/auth/role.guard';
import { Roles } from '../../common/auth/role.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

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
        destination: (req, file, cb) => {
          const uploadPath = './uploads';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
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
        destination: (req, file, cb) => {
          const uploadPath = './uploads';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
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
    return this.shopItemsService.update(+id, updateShopItemDto);
  }

  @Roles('admin', 'teacher')
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shopItemsService.remove(+id);
  }
}
