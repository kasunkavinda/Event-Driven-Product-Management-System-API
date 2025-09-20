import { Controller, Get, Header, Req, Res, UseGuards } from '@nestjs/common';
import { SellerGuard } from '../common/guards/seller.guard';
import { PrismaClient } from '@prisma/client';
import { Response } from 'express';
import { Readable } from 'stream';

@Controller('products')
@UseGuards(SellerGuard)
export class ExportController {
  private prisma = new PrismaClient();

  @Get('export')
  @Header('Content-Type', 'text/csv')
  async export(@Req() req: any, @Res() res: Response) {
    const stream = new Readable({ read() {} });
    stream.pipe(res);
    stream.push('id,name,price,quantity,category\n');
    const rows = await this.prisma.product.findMany({
      where: { sellerId: req.sellerId },
    });
    for (const r of rows)
      stream.push(
        `${r.id},"${r.name}",${r.price},${r.quantity},"${r.category}"\n`,
      );
    stream.push(null);
  }
}
