import { Injectable } from '@nestjs/common';
import { PrismaClient, Product } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from '../kafka/kafka.service';
import { TOPIC } from '../events/events.types';
import { err, Result } from '../util/util';

@Injectable()
export class ProductsService {
  private prisma = new PrismaClient();
  private threshold: number;

  constructor(
    private kafka: KafkaService,
    cfg: ConfigService,
  ) {
    this.threshold = Number(cfg.get('LOW_STOCK_THRESHOLD') ?? 5);
  }

  async list(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      orderBy: { id: 'desc' },
    });
  }

  async create(
    sellerId: string,
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<Product>> {
    try {
      const product = await this.prisma.product.create({
        data: { ...data, sellerId },
      });
      await this.kafka.emit(TOPIC, `${sellerId}:${product.id}`, {
        type: 'ProductCreated',
        ts: new Date().toISOString(),
        sellerId,
        productId: product.id,
        payload: {
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: product.quantity,
            category: product.category,
          },
        },
      });
      await this.maybeLowStock(sellerId, product);
      return { success: true, data: product };
    } catch (e) {
      return { success: false, error: err(e) };
    }
  }

  async update(
    sellerId: string,
    id: number,
    patch: Partial<Product>,
  ): Promise<Result<Product>> {
    try {
      const updated = await this.prisma.product.updateMany({
        where: { id, sellerId },
        data: patch,
      });
      if (updated.count === 0) return { success: false, error: 'Not found' };

      const after = await this.prisma.product.findFirstOrThrow({
        where: { id, sellerId },
      });

      await this.kafka.emit(TOPIC, `${sellerId}:${id}`, {
        type: 'ProductUpdated',
        ts: new Date().toISOString(),
        sellerId,
        productId: id,
        payload: {
          before: {},
          after: { quantity: after.quantity },
        },
      });
      await this.maybeLowStock(sellerId, after);
      return { success: true, data: after };
    } catch (e) {
      return { success: false, error: err(e) };
    }
  }

  async remove(sellerId: string, id: number): Promise<Result<{ id: number }>> {
    try {
      const res = await this.prisma.product.deleteMany({
        where: { id, sellerId },
      });
      if (res.count === 0) return { success: false, error: 'Not found' };

      await this.kafka.emit(TOPIC, `${sellerId}:${id}`, {
        type: 'ProductDeleted',
        ts: new Date().toISOString(),
        sellerId,
        productId: id,
        payload: { id },
      });
      return { success: true, data: { id } };
    } catch (e) {
      return { success: false, error: err(e) };
    }
  }

  private async maybeLowStock(sellerId: string, p: Product) {
    if (p.quantity < this.threshold) {
      await this.kafka.emit(TOPIC, `${sellerId}:${p.id}`, {
        type: 'LowStockWarning',
        ts: new Date().toISOString(),
        sellerId,
        productId: p.id,
        payload: { id: p.id, quantity: p.quantity, threshold: this.threshold },
      });
    }
  }
}
