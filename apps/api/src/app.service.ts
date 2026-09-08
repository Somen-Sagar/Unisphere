import { Injectable } from '@nestjs/common';

import { RedisService } from './cache/redis.service';
import { PrismaService } from './database/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealth(): Promise<{
    service: string;
    status: string;
    database: string;
    redis: string;
    timestamp: string;
  }> {
    await this.prisma.$queryRaw`SELECT 1`;
    const redisConnected = await this.redis.ping();

    return {
      service: 'unisphere-api',
      status: redisConnected ? 'ok' : 'degraded',
      database: 'connected',
      redis: redisConnected ? 'connected' : 'unavailable',
      timestamp: new Date().toISOString(),
    };
  }
}
