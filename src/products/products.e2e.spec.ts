import { Test } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { KafkaService } from '../kafka/kafka.service';
import { ConfigService } from '@nestjs/config';
import { TOPIC } from '../events/events.types';

type MockedPrisma = {
  product: {
    findMany: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
    findFirstOrThrow: jest.Mock;
    deleteMany: jest.Mock;
  };
};

function makePrismaMock(): MockedPrisma {
  return {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

const kafkaMock = {
  emit: jest.fn().mockResolvedValue(undefined),
};

const cfgMock = {
  get: jest.fn((key: string) => {
    if (key === 'LOW_STOCK_THRESHOLD') return 5;
    return undefined;
  }),
};

const product = (over: Partial<any> = {}) => ({
  id: 1,
  sellerId: 'seller-1',
  name: 'P1',
  description: null,
  price: 12.5,
  quantity: 3,
  category: 'cat',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('ProductsService (unit)', () => {
  let service: ProductsService;
  let prisma: MockedPrisma;

  beforeEach(async () => {
    jest.useFakeTimers();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: KafkaService, useValue: kafkaMock },
        { provide: ConfigService, useValue: cfgMock },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
    prisma = makePrismaMock();

    (service as any).prisma = prisma;

    kafkaMock.emit.mockClear();
    Object.values(prisma.product).forEach((fn) => fn.mockReset());
  });

  describe('list', () => {
    it('returns seller products ordered desc by id', async () => {
      prisma.product.findMany.mockResolvedValue([
        product({ id: 2 }),
        product({ id: 1 }),
      ]);
      const res = await service.list('seller-1');
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { sellerId: 'seller-1' },
        orderBy: { id: 'desc' },
      });
      expect(res).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('creates product and emits ProductCreated (no LowStock when qty >= threshold)', async () => {
      prisma.product.create.mockResolvedValue(
        product({ id: 10, quantity: 7, sellerId: 's1' }),
      );

      const out = await service.create('s1', {
        sellerId: 's1',
        name: 'A',
        description: null,
        price: 20,
        quantity: 7,
        category: 'cat',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      expect(out.success).toBe(true);
      expect(kafkaMock.emit).toHaveBeenCalledTimes(1);
      expect(kafkaMock.emit).toHaveBeenCalledWith(
        TOPIC,
        's1:10',
        expect.objectContaining({
          type: 'ProductCreated',
          sellerId: 's1',
          productId: 10,
        }),
      );
    });

    it('creates product and also emits LowStockWarning when qty < threshold', async () => {
      prisma.product.create.mockResolvedValue(
        product({ id: 11, quantity: 1, sellerId: 's1' }),
      );

      const out = await service.create('s1', {
        sellerId: 's1',
        name: 'A',
        description: null,
        price: 20,
        quantity: 1,
        category: 'cat',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      expect(out.success).toBe(true);

      expect(kafkaMock.emit).toHaveBeenCalledTimes(2);
      expect(kafkaMock.emit).toHaveBeenNthCalledWith(
        1,
        TOPIC,
        's1:11',
        expect.objectContaining({ type: 'ProductCreated', productId: 11 }),
      );
      expect(kafkaMock.emit).toHaveBeenNthCalledWith(
        2,
        TOPIC,
        's1:11',
        expect.objectContaining({
          type: 'LowStockWarning',
          payload: expect.objectContaining({ quantity: 1, threshold: 5 }),
        }),
      );
    });

    it('returns failure when prisma.create throws', async () => {
      prisma.product.create.mockRejectedValue(new Error('db down'));
      const out = await service.create('s1', {
        sellerId: 's1',
        name: 'A',
        description: null,
        price: 20,
        quantity: 1,
        category: 'cat',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      expect(out.success).toBe(false);
      if (!out.success) {
        expect(out.error).toBeDefined();
      }
      expect(kafkaMock.emit).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns Not found when updateMany count is 0', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 0 });
      const out = await service.update('s1', 99, { quantity: 3 });
      expect(out).toEqual({ success: false, error: 'Not found' });
      expect(prisma.product.findFirstOrThrow).not.toHaveBeenCalled();
      expect(kafkaMock.emit).not.toHaveBeenCalled();
    });

    it('updates product, emits ProductUpdated only when qty >= threshold', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      prisma.product.findFirstOrThrow.mockResolvedValue(
        product({ id: 5, sellerId: 's1', quantity: 6 }),
      );

      const out = await service.update('s1', 5, { quantity: 6 });

      expect(out.success).toBe(true);
      expect(prisma.product.findFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 5, sellerId: 's1' },
      });

      expect(kafkaMock.emit).toHaveBeenCalledTimes(1);
      expect(kafkaMock.emit).toHaveBeenCalledWith(
        TOPIC,
        's1:5',
        expect.objectContaining({ type: 'ProductUpdated', productId: 5 }),
      );
    });

    it('updates product and emits LowStockWarning when qty < threshold', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      prisma.product.findFirstOrThrow.mockResolvedValue(
        product({ id: 6, sellerId: 's1', quantity: 2 }),
      );

      const out = await service.update('s1', 6, { quantity: 2 });

      expect(out.success).toBe(true);

      expect(kafkaMock.emit).toHaveBeenCalledTimes(2);
      expect(kafkaMock.emit).toHaveBeenNthCalledWith(
        1,
        TOPIC,
        's1:6',
        expect.objectContaining({ type: 'ProductUpdated', productId: 6 }),
      );
      expect(kafkaMock.emit).toHaveBeenNthCalledWith(
        2,
        TOPIC,
        's1:6',
        expect.objectContaining({
          type: 'LowStockWarning',
          payload: expect.objectContaining({ quantity: 2, threshold: 5 }),
        }),
      );
    });

    it('returns failure when prisma throws', async () => {
      prisma.product.updateMany.mockRejectedValue(new Error('boom'));
      const out = await service.update('s1', 1, { quantity: 1 });
      expect(out.success).toBe(false);
      if (!out.success) {
        expect(out.error).toBeDefined();
      }
    });
  });

  describe('remove', () => {
    it('returns Not found when deleteMany count is 0', async () => {
      prisma.product.deleteMany.mockResolvedValue({ count: 0 });
      const out = await service.remove('s1', 123);
      expect(out).toEqual({ success: false, error: 'Not found' });
      expect(kafkaMock.emit).not.toHaveBeenCalled();
    });

    it('deletes product and emits ProductDeleted', async () => {
      prisma.product.deleteMany.mockResolvedValue({ count: 1 });

      const out = await service.remove('s1', 123);

      expect(out).toEqual({ success: true, data: { id: 123 } });
      expect(kafkaMock.emit).toHaveBeenCalledTimes(1);
      expect(kafkaMock.emit).toHaveBeenCalledWith(
        TOPIC,
        's1:123',
        expect.objectContaining({
          type: 'ProductDeleted',
          payload: { id: 123 },
        }),
      );
    });

    it('returns failure when prisma throws', async () => {
      prisma.product.deleteMany.mockRejectedValue(new Error('nope'));
      const out = await service.remove('s1', 1);
      expect(out.success).toBe(false);
      if (!out.success) {
        expect(out.error).toBeDefined();
      }
    });
  });
});
