import { Injectable } from '@nestjs/common';
import { Response } from 'express';

type Client = { sellerId: string; res: Response };

@Injectable()
export class SseGateway {
  private clients: Client[] = [];

  addClient(sellerId: string, res: Response) {
    this.clients.push({ sellerId, res });
    console.log('[SSE] client added', { sellerId, total: this.clients.length });
    res.on('close', () => {
      this.clients = this.clients.filter((c) => c.res !== res);
      console.log('[SSE] client closed', {
        sellerId,
        total: this.clients.length,
      });
    });
  }

  broadcast(sellerId: string, data: any) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    const targets = this.clients.filter((c) => c.sellerId === sellerId);

    console.log('[SSE] broadcast', { sellerId, matches: targets.length });
    targets.forEach((c) => c.res.write(payload));
  }
}
