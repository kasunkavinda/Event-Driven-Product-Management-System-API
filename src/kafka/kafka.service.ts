import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer!: Producer;

  constructor(private cfg: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'ecom-api',
      brokers: this.cfg.get<string>('KAFKA_BROKERS')!.split(','),
      logLevel: logLevel.ERROR,
    });
  }

  async onModuleInit() {
    this.producer = this.kafka.producer();
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  async emit(topic: string, key: string, value: object) {
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
  }

  createConsumer(groupId: string): Consumer {
    return this.kafka.consumer({ groupId });
  }
}
