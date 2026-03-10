// src/tables/auction-item/action-items.service.ts (yoki auction_items.service.ts)
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { UpdateActionItemDto } from './dto/update-action-item.dto';
import { AuctionItems } from './auction-items.model';
import { Auction } from '../auctions/auctions.model';
import { Bids } from '../bids/bids.model';
import { User } from '../user/user.model';
import { CoinBlock } from '../coin_blocks/coin_blocks.model';

@Injectable()
export class ActionItemsService {
  constructor(
    @InjectModel(AuctionItems)
    private readonly auctionItemModel: typeof AuctionItems,
  ) {}

  // Yangi mahsulot (auction item) qo‘shish
  async create(createActionItemDto: CreateActionItemDto) {
    try {
      const newItem = await this.auctionItemModel.create(
        createActionItemDto as AuctionItems,
      );
      return newItem;
    } catch (err) {
      console.log(err.message);
      throw new HttpException(
        'Failed to create auction item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bir nechta mahsulotni birdaniga qo‘shish
  async createMany(createActionItemDto: CreateActionItemDto[]) {
    try {
      const newItems = await this.auctionItemModel.bulkCreate(
        createActionItemDto as AuctionItems[],
      );
      return newItems;
    } catch (error) {
      console.log(error.message);
      throw new HttpException(
        'Failed to create auction items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha mahsulotlarni olish
  async findAll() {
    try {
      const items = await this.auctionItemModel.findAll({
        include: [
          { model: Auction },
          { model: Bids },
          { model: User },
          { model: CoinBlock },
        ],
      });
      return items;
    } catch (err) {
      throw new HttpException(
        err.message || 'Failed to get all auction items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bitta mahsulotni ID bo‘yicha olish
  async findOne(id: number) {
    const item = await this.auctionItemModel.findByPk(id, {
      include: [
        { model: Auction },
        { model: Bids },
        { model: User },
        { model: CoinBlock },
      ],
    });

    if (!item) {
      throw new NotFoundException(`ID si ${id} bo‘lgan mahsulot topilmadi`);
    }

    return item;
  }

  // Mahsulotni yangilash
  async update(id: number, updateActionItemDto: UpdateActionItemDto) {
    const [updatedCount] = await this.auctionItemModel.update(
      updateActionItemDto,
      {
        where: { id },
      },
    );

    if (updatedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan mahsulot topilmadi`);
    }

    return this.auctionItemModel.findByPk(id);
  }

  // Mahsulotni o‘chirish
  async remove(id: number) {
    const deletedCount = await this.auctionItemModel.destroy({ where: { id } });

    if (deletedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan mahsulot topilmadi`);
    }

    return {
      message: `ID si ${id} bo‘lgan mahsulot muvaffaqiyatli o‘chirildi`,
    };
  }
}
