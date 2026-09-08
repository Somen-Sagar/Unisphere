import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { CampusEvent, PaginatedResponse } from '@unisphere/types';
import {
  createEventSchema,
  eventQuerySchema,
  type CreateEventInput,
  type EventQueryInput,
} from '@unisphere/validation';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { RolesGuard } from '../common/roles.guard';
import { TenantRoles } from '../common/roles.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EventsService } from './events.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query(new ZodValidationPipe(eventQuerySchema)) query: EventQueryInput,
  ): Promise<PaginatedResponse<CampusEvent>> {
    return this.events.findAll(tenant, query);
  }

  @Get(':eventId')
  findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
  ): Promise<CampusEvent> {
    return this.events.findOne(tenant, eventId);
  }

  @UseGuards(RolesGuard)
  @TenantRoles('CLUB_ADMIN', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN')
  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createEventSchema)) input: CreateEventInput,
  ): Promise<CampusEvent> {
    return this.events.create(tenant, input);
  }
}
