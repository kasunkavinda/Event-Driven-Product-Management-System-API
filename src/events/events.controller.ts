import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { SseGateway } from '../common/sse/sse.gateway';

@Controller('events')
export class EventsController {
  constructor(private sse: SseGateway) {}

  @Get('stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  stream(@Query('sellerId') sellerId = 'demo', @Res() res: Response) {
    // Flush headers so browser treats this as streaming
    (res as any).flushHeaders?.();

    // Register client
    this.sse.addClient(sellerId, res);

    // Send a ready event immediately
    res.write(`event: ready\ndata: "ok"\n\n`);

    // Heartbeat so proxies/browsers keep it open
    const hb = setInterval(() => {
      res.write(`: hb ${Date.now()}\n\n`);
    }, 15000);

    res.on('close', () => clearInterval(hb));
  }
}
