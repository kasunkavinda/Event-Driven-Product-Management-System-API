import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from './kafka/kafka.module';
import { KafkaNotificationsConsumer } from './kafka/kafka.consumer';
import { DdbService } from './storage/ddb.service';
import { ProductsModule } from './products/products.module';
import { EventsModule } from './events/events.module';
import { SseModule } from './common/sse/sse.module';
import { ExportModule } from './products/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SseModule,
    KafkaModule,
    ProductsModule,
    EventsModule,
    ExportModule,
  ],

  controllers: [AppController],
  providers: [AppService, KafkaNotificationsConsumer, DdbService],
})
export class AppModule {}
