import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { AiService, type AiChatInput, type AiChatResponse } from './ai.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @CurrentTenant() tenant: TenantContext,
    @Body() body: AiChatInput,
  ): Promise<AiChatResponse> {
    return this.aiService.chat(tenant, {
      message: body.message,
      sessionId: body.sessionId,
    });
  }
}
