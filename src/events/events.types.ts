export type BaseEvent<TType extends string, TPayload> = {
  type: TType;
  ts: string;
  sellerId: string;
  productId?: number;
  payload: TPayload;
};

export type ProductCreated = BaseEvent<
  'ProductCreated',
  {
    product: {
      id: number;
      name: string;
      price: number;
      quantity: number;
      category: string;
    };
  }
>;
export type ProductUpdated = BaseEvent<
  'ProductUpdated',
  {
    before?: Partial<{
      name: string;
      price: number;
      quantity: number;
      category: string;
    }>;
    after: Partial<{
      name: string;
      price: number;
      quantity: number;
      category: string;
    }>;
  }
>;
export type ProductDeleted = BaseEvent<'ProductDeleted', { id: number }>;
export type LowStockWarning = BaseEvent<
  'LowStockWarning',
  {
    id: number;
    quantity: number;
    threshold: number;
  }
>;

export type ProductEvent =
  | ProductCreated
  | ProductUpdated
  | ProductDeleted
  | LowStockWarning;
export const TOPIC = 'product-events';
