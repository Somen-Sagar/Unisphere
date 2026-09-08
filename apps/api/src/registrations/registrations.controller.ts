import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { EventRegistration } from '@unisphere/types';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RegistrationsService } from './registrations.service';

const scanSchema = z.object({ qrToken: z.string().min(1) });

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post('events/:eventId/registrations')
  register(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
  ): Promise<EventRegistration> {
    return this.registrations.register(tenant, eventId);
  }

  @Get('registrations/me')
  findMine(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<EventRegistration[]> {
    return this.registrations.findMine(tenant);
  }

  @Post('attendance/scan')
  scan(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(scanSchema)) input: { qrToken: string },
  ): Promise<EventRegistration> {
    return this.registrations.scan(tenant, input.qrToken);
  }
}
