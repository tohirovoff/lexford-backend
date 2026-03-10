// src/tables/bid/bids.service.ts (yoki sizning papka tuzilishingizga moslashtiring)

import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { Bids } from './bids.model';
import { AuctionItems } from '../action-items/auction-items.model';
import { User } from '../user/user.model';
import { CoinTransactionsService } from '../coin_transactions/coin_transactions.service';
import { CoinBlocksService } from '../coin_blocks/coin_blocks.service';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class BidsService {
  constructor(
    @InjectModel(Bids)
    private readonly bidModel: typeof Bids,
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(AuctionItems)
    private readonly auctionItemModel: typeof AuctionItems,
    private readonly coinTransactionsService: CoinTransactionsService,
    private readonly coinBlocksService: CoinBlocksService,
    private readonly sequelize: Sequelize,
  ) {}

  // Yangi stavka qo‘shish
  async create(createBidDto: CreateBidDto) {
    return await this.sequelize.transaction(async (t) => {
      // 1. Mahsulotni tekshirish
      const item = await this.auctionItemModel.findByPk(
        createBidDto.auction_item_id,
        { transaction: t },
      );
      if (!item) throw new NotFoundException('Auksion mahsuloti topilmadi');

      // 2. Balansni tekshirish
      const user = await this.userModel.findByPk(createBidDto.user_id, {
        transaction: t,
      });
      if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

      const userBalance = await this.coinTransactionsService.getUserBalance(
        createBidDto.user_id,
      );
      if (userBalance < createBidDto.bid_amount) {
        throw new BadRequestException('Mablag‘ yetarli emas');
      }

      // 3. Joriy eng yuqori stavkani tekshirish
      const currentHighestBid = await this.bidModel.findOne({
        where: { auction_item_id: createBidDto.auction_item_id },
        order: [['bid_amount', 'DESC']],
        transaction: t,
      });

      if (
        currentHighestBid &&
        createBidDto.bid_amount <= currentHighestBid.bid_amount
      ) {
        throw new BadRequestException(
          'Stavka joriy eng yuqori stavkadan katta bo‘lishi kerak',
        );
      }

      // 4. Oldingi eng yuqori bidderning coinlarini unblock qilish
      if (currentHighestBid) {
        const previousBlock = await this.coinBlocksService.findOneByFilter(
          {
            user_id: currentHighestBid.user_id,
            auction_item_id: createBidDto.auction_item_id,
            status: 'blocked',
          },
          t,
        );

        if (previousBlock) {
          await previousBlock.update(
            { status: 'unblocked' },
            { transaction: t },
          );
          // User balansini User.coins fieldda ham yangilash (agar redundant saqlanayotgan bo'lsa)
          // Eslatma: Hozircha blocked_coins literal bilan hisoblanadi, lekin User.coins ni tranzaksiya bilan kamaytirishimiz kerak
        }
      }

      // 5. Yangi stavkani yaratish
      const newBid = await this.bidModel.create(createBidDto as Bids, {
        transaction: t,
      });

      // 6. Coinlarni bloklash
      await this.coinBlocksService.create(
        {
          user_id: createBidDto.user_id,
          auction_item_id: createBidDto.auction_item_id,
          blocked_amount: createBidDto.bid_amount,
          status: 'blocked',
        } as any,
        t,
      );

      // 7. Userning "coins" (mavjud balans) fieldidan ayirish
      await this.coinTransactionsService.create(
        {
          user_id: createBidDto.user_id,
          amount: -createBidDto.bid_amount,
          type: 'bid_block',
          reason: `Stavka uchun coinlar bloklandi: ${item.name}`,
        } as any,
        t,
      );

      // 8. Oldingi bidderga coinlarni qaytarish (agar bo'lsa)
      if (currentHighestBid) {
        await this.coinTransactionsService.create(
          {
            user_id: currentHighestBid.user_id,
            amount: currentHighestBid.bid_amount,
            type: 'bid_refund',
            reason: `Stavka qaytarildi (outbid): ${item.name}`,
          } as any,
          t,
        );
      }

      return newBid;
    });
  }

  // Bir nechta stavka birda qo‘shish (bulk)
  async createMany(createBidDtos: CreateBidDto[]) {
    try {
      const newBids = await this.bidModel.bulkCreate(createBidDtos as Bids[]);
      return newBids;
    } catch (error) {
      console.log(error.message);
      throw new HttpException(
        'Bir nechta stavka qo‘shishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha stavkalarni olish
  async findAll() {
    try {
      const bids = await this.bidModel.findAll({
        include: [{ model: AuctionItems }, { model: User }],
        order: [['createdAt', 'DESC']], // yangi stavkalar birinchi
      });
      return bids;
    } catch (err) {
      throw new HttpException(
        err.message || 'Barcha stavkalarni olishda xatolik',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bitta stavkani ID bo‘yicha olish
  async findOne(id: number) {
    const bid = await this.bidModel.findByPk(id, {
      include: [{ model: AuctionItems }, { model: User }],
    });

    if (!bid) {
      throw new NotFoundException(`ID si ${id} bo‘lgan stavka topilmadi`);
    }

    return bid;
  }

  // Stavkani yangilash (masalan, is_active o‘zgartirish)
  async update(id: number, updateBidDto: UpdateBidDto) {
    const [updatedCount] = await this.bidModel.update(updateBidDto, {
      where: { id },
    });

    if (updatedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan stavka topilmadi`);
    }

    return this.bidModel.findByPk(id);
  }

  // Stavkani o‘chirish (ehtiyot bo‘ling, odatda o‘chirilmaydi, lekin kerak bo‘lsa)
  async remove(id: number) {
    const deletedCount = await this.bidModel.destroy({ where: { id } });

    if (deletedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan stavka topilmadi`);
    }

    return { message: `ID si ${id} bo‘lgan stavka muvaffaqiyatli o‘chirildi` };
  }

  // Qo‘shimcha: Ma’lum bir mahsulot uchun stavkalarni olish (foydali metod)
  async findByAuctionItemId(auction_item_id: number) {
    const bids = await this.bidModel.findAll({
      where: { auction_item_id },
      order: [['bid_amount', 'DESC']],
    });

    return bids;
  }

  // Qo‘shimcha: Hozirgi eng yuqori stavkani olish
  async getCurrentHighestBid(auction_item_id: number) {
    const bid = await this.bidModel.findOne({
      where: { auction_item_id },
      order: [['bid_amount', 'DESC']],
      include: [{ model: User }], // foydali: kim qo'yganini ko'rish uchun
    });

    if (!bid) {
      // Variant 1: Oddiy null emas, ma'lumotli javob
      return {
        message: "Hozircha bu mahsulotga stavka qo'yilmagan",
        highest_bid: null,
        auction_item_id,
      };

      // Yoki Variant 2: 404 xato chiqarish (agar majburiy bo'lsa)
      // throw new NotFoundException('Eng yuqori stavka topilmadi');
    }

    return bid;
  }
}
