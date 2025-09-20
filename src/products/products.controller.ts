import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductInputDto } from './dto/product.dto';
import { SellerGuard } from '../common/guards/seller.guard';

@Controller('products')
@UseGuards(SellerGuard)
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get() list(@Req() req: any) {
    return this.svc.list(req.sellerId);
  }

  @Post() create(@Req() req: any, @Body() dto: ProductInputDto) {
    return this.svc.create(req.sellerId, dto as any);
  }

  @Put(':id') update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProductInputDto,
  ) {
    return this.svc.update(req.sellerId, id, dto as any);
  }

  @Delete(':id') async remove(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.svc.remove(req.sellerId, id);
  }
}
