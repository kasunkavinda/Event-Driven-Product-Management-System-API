import { Injectable } from '@nestjs/common';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DdbService {
  private client: DynamoDBClient;
  private table = 'EventLog';
  constructor(cfg: ConfigService) {
    this.client = new DynamoDBClient({
      endpoint: cfg.get('DDB_ENDPOINT'),
      region: 'us-east-1',
      credentials: { accessKeyId: 'x', secretAccessKey: 'x' },
    });
  }
  async putEvent(evt: any) {
    await this.client.send(
      new PutItemCommand({
        TableName: this.table,
        Item: {
          PK: { S: `SELLER#${evt.sellerId}` },
          SK: { S: `${evt.ts}#${evt.type}` },
          Type: { S: evt.type },
          Payload: { S: JSON.stringify(evt.payload) },
        },
      }),
    );
  }
}
