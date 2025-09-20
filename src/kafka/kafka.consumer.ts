import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { ConfigService } from '@nestjs/config';
import { TOPIC, ProductEvent } from '../events/events.types';
import { SseGateway } from '../common/sse/sse.gateway';
import { DdbService } from '../storage/ddb.service';

@Injectable()
export class KafkaNotificationsConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private consumer;

  constructor(
    private kafka: KafkaService,
    private sse: SseGateway,
    private cfg: ConfigService,
    private ddb: DdbService,
  ) {
    this.consumer = this.kafka.createConsumer('notifications-consumer');
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: TOPIC, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const evt = JSON.parse(message.value!.toString()) as ProductEvent;

        // log to DynamoDB (recent)
        if (this.cfg.get('ENABLE_EVENT_LOG') === 'true') {
          await this.ddb.putEvent(evt);
        }

        // Fan-out only LowStockWarning to UI
        if (evt.type === 'LowStockWarning') {
          this.sse.broadcast(evt.sellerId, evt);
        }
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
