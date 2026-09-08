import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

type HealthResponse = {
  service: string;
  status: string;
  database: string;
  redis: string;
  timestamp: string;
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): Promise<HealthResponse> {
    return this.appService.getHealth();
  }
}
