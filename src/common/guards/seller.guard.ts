import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SellerGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const sellerId = req.header('x-seller-id');
    if (!sellerId) throw new UnauthorizedException('Missing x-seller-id');
    req.sellerId = sellerId;
    return true;
  }
}

declare module 'http' {
  interface IncomingMessage {
    sellerId?: string;
  }
}
