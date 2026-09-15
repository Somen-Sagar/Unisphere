import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { CampusEvent, PaginatedResponse } from '@unisphere/types';
import {
  createEventSchema,
  eventQuerySchema,
  updateEventSchema,
  type CreateEventInput,
  type EventQueryInput,
  type UpdateEventInput,
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

  @UseGuards(RolesGuard)
  @TenantRoles('CLUB_ADMIN', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN')
  @Patch(':eventId')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(updateEventSchema)) input: UpdateEventInput,
  ): Promise<CampusEvent> {
    return this.events.update(tenant, eventId, input);
  }

  @UseGuards(RolesGuard)
  @TenantRoles('CLUB_ADMIN', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN')
  @Post(':eventId/publish')
  publish(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
  ): Promise<CampusEvent> {
    return this.events.publish(tenant, eventId);
  }
}
