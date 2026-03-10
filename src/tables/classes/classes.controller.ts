import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { RolesGuard } from 'src/common/auth/role.guard';
import { Roles } from 'src/common/auth/role.decorator';
import { AuthGuard } from 'src/common/auth/auth.guard';

@Controller('class')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() createClassDto: CreateClassDto) {
    return await this.classesService.create(createClassDto);
  }

  @Post('create-many')
  async createMany(@Body() createClassDto: CreateClassDto[]) {
    return this.classesService.createMany(createClassDto);
  }

  @Get('getAll')
  findAll() {
    return this.classesService.findAll();
  }

  @Get('leaderboard')
  async getClassesLeaderboard() {
    return this.classesService.getClassesLeaderboard();
  }

  @Get(':id/leaderboard')
  async getLeaderboard(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.classesService.getClassLeaderboard(id, page, limit);
  }

  @Get(':id/top3')
  async getTop3(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.getClassTop3(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(+id, updateClassDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.classesService.remove(+id);
  }
}
