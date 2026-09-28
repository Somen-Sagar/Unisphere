import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  CampusEvent,
  EventAccess,
  EventOrganizer,
  PaginatedResponse,
} from '@unisphere/types';
import {
  assignEventOrganizerSchema,
  createEventSchema,
  eventQuerySchema,
  updateEventSchema,
  type CreateEventInput,
  type AssignEventOrganizerInput,
  type EventQueryInput,
  type UpdateEventInput,
} from '@unisphere/validation';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
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

  @Get(':eventId/access')
  access(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
  ): Promise<EventAccess> {
    return this.events.access(tenant, eventId);
  }

  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createEventSchema)) input: CreateEventInput,
  ): Promise<CampusEvent> {
    return this.events.create(tenant, input);
  }

  @Patch(':eventId')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(updateEventSchema)) input: UpdateEventInput,
  ): Promise<CampusEvent> {
    return this.events.update(tenant, eventId, input);
  }

  @Post(':eventId/publish')
  publish(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
  ): Promise<CampusEvent> {
    return this.events.publish(tenant, eventId);
  }

  @Get(':eventId/organizers')
  organizers(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
  ): Promise<EventOrganizer[]> {
    return this.events.organizers(tenant, eventId);
  }

  @Post(':eventId/organizers')
  assignOrganizer(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(assignEventOrganizerSchema))
    input: AssignEventOrganizerInput,
  ): Promise<EventOrganizer> {
    return this.events.assignOrganizer(tenant, eventId, input);
  }

  @Delete(':eventId/organizers/:userId')
  removeOrganizer(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.events.removeOrganizer(tenant, eventId, userId);
  }

  @Delete(':eventId')
  remove(
    @CurrentTenant() tenant: TenantContext,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    return this.events.remove(tenant, eventId);
  }
}
