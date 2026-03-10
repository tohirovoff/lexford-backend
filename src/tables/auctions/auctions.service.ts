import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { Auction } from './auctions.model';
import { Penalties } from '../penalties/penalties.model';
import { AuctionLog } from '../auction_logs/auction_logs.model';
import { AuctionItems } from '../action-items/auction-items.model';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectModel(Auction)
    private readonly auctionModel: typeof Auction,
  ) {}

  // Yangi auksion qo‘shish
  async create(createAuctionDto: CreateAuctionDto) {
    try {
      const newAuction = await this.auctionModel.create(
        createAuctionDto as Auction,
      );
      return newAuction;
    } catch (err) {
      console.log(err.message);
      throw new HttpException(
        'Failed to create auction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bir nechta auksionni birda qo‘shish (bulk create)
  async createMany(createAuctionDto: CreateAuctionDto[]) {
    try {
      const newAuctions = await this.auctionModel.bulkCreate(
        createAuctionDto as Auction[],
      );
      return newAuctions;
    } catch (error) {
      console.log(error.message);
      throw new HttpException(
        'Failed to create auctions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Barcha auksionlarni olish
  async findAll() {
    try {
      const auctions = await this.auctionModel.findAll({
        include: [
          { model: Penalties },
          { model: AuctionLog },
          { model: AuctionItems },
        ],
      });
      return auctions;
    } catch (err) {
      throw new HttpException(
        err.message || 'Failed to get all auctions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Bitta auksionni ID bo‘yicha olish
  async findOne(id: number) {
    const auctionItem = await this.auctionModel.findByPk(id, {
      include: [
        { model: Penalties },
        { model: AuctionLog },
        { model: AuctionItems },
      ],
    });

    if (!auctionItem) {
      throw new NotFoundException(`ID si ${id} bo‘lgan auksion topilmadi`);
    }

    return auctionItem;
  }

  // Auksionni yangilash
  async update(id: number, updateAuctionDto: UpdateAuctionDto) {
    const [updatedCount] = await this.auctionModel.update(updateAuctionDto, {
      where: { id },
    });

    if (updatedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan auksion topilmadi`);
    }

    return this.auctionModel.findByPk(id);
  }

  // Auksionni o‘chirish
  async remove(id: number) {
    const deletedCount = await this.auctionModel.destroy({ where: { id } });

    if (deletedCount === 0) {
      throw new NotFoundException(`ID si ${id} bo‘lgan auksion topilmadi`);
    }

    return { message: `ID si ${id} bo‘lgan auksion muvaffaqiyatli o‘chirildi` };
  }
}
