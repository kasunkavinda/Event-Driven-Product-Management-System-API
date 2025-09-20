import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { SseGateway } from '../common/sse/sse.gateway';

@Module({
  controllers: [EventsController],
})
export class EventsModule {}
