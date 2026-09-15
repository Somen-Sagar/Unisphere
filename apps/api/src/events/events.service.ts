import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canTransitionEvent } from '@unisphere/business-rules';
import type { CampusEvent, PaginatedResponse } from '@unisphere/types';
import type {
  CreateEventInput,
  EventQueryInput,
  UpdateEventInput,
} from '@unisphere/validation';
import { randomUUID } from 'node:crypto';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';
import { toCampusEvent } from './event.mapper';

const publicStatuses = [
  'APPROVED',
  'PUBLISHED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'ONGOING',
  'COMPLETED',
] satisfies CampusEvent['status'][];

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenant: TenantContext,
    query: EventQueryInput,
  ): Promise<PaginatedResponse<CampusEvent>> {
    const where = {
      collegeId: tenant.collegeId,
      status: query.status ? query.status : { in: [...publicStatuses] },
      ...(query.upcoming ? { endsAt: { gte: new Date() } } : {}),
      ...(query.clubId ? { clubId: query.clubId } : {}),
      ...(query.category ? { eventType: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                venue: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                eventType: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        include: {
          _count: {
            select: {
              registrations: {
                where: { status: 'REGISTERED' },
              },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items: events.map((event) =>
        toCampusEvent(event as Parameters<typeof toCampusEvent>[0]),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(tenant: TenantContext, eventId: string): Promise<CampusEvent> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        collegeId: tenant.collegeId,
        status: { in: [...publicStatuses] },
      },
      include: {
        _count: {
          select: {
            registrations: {
              where: { status: 'REGISTERED' },
            },
          },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found.');
    return toCampusEvent(event);
  }

  async create(
    tenant: TenantContext,
    input: CreateEventInput,
  ): Promise<CampusEvent> {
    await this.ensureRelatedRecordsBelongToTenant(tenant, input);

    const event = await this.prisma.event.create({
      data: {
        collegeId: tenant.collegeId,
        clubId: input.clubId,
        departmentId: input.departmentId,
        organizerId: tenant.userId,
        slug: await this.uniqueEventSlug(
          tenant.collegeId,
          input.slug ?? input.title,
        ),
        title: input.title,
        description: input.description,
        eventType: input.eventType ?? 'GENERAL',
        venue: input.venue,
        onlineMeetingUrl: input.onlineMeetingUrl,
        imageUrl: input.imageUrl,
        posterUrl: input.posterUrl ?? input.imageUrl,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        registrationOpensAt: input.registrationOpensAt
          ? new Date(input.registrationOpensAt)
          : undefined,
        registrationClosesAt: input.registrationClosesAt
          ? new Date(input.registrationClosesAt)
          : undefined,
        capacity: input.capacity,
        feeAmount: input.feeAmount,
        currency: input.currency ?? 'INR',
        status: 'PENDING_APPROVAL',
      },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    return toCampusEvent(event);
  }

  async update(
    tenant: TenantContext,
    eventId: string,
    input: UpdateEventInput,
  ): Promise<CampusEvent> {
    const existing = await this.prisma.event.findFirst({
      where: { id: eventId, collegeId: tenant.collegeId },
      select: {
        id: true,
        organizerId: true,
        clubId: true,
        status: true,
      },
    });
    if (!existing) throw new NotFoundException('Event not found.');
    await this.ensureCanManageEvent(tenant, existing);

    if (
      input.status &&
      input.status !== existing.status &&
      !canTransitionEvent(existing.status, input.status)
    ) {
      throw new BadRequestException(
        `Cannot transition event from ${existing.status} to ${input.status}.`,
      );
    }

    await this.ensureRelatedRecordsBelongToTenant(tenant, input);

    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        clubId: input.clubId,
        departmentId: input.departmentId,
        ...(input.slug
          ? {
              slug: await this.uniqueEventSlug(
                tenant.collegeId,
                input.slug,
                eventId,
              ),
            }
          : {}),
        title: input.title,
        description: input.description,
        eventType: input.eventType,
        venue: input.venue,
        onlineMeetingUrl: input.onlineMeetingUrl,
        imageUrl: input.imageUrl,
        posterUrl: input.posterUrl ?? input.imageUrl,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        registrationOpensAt: input.registrationOpensAt
          ? new Date(input.registrationOpensAt)
          : undefined,
        registrationClosesAt: input.registrationClosesAt
          ? new Date(input.registrationClosesAt)
          : undefined,
        capacity: input.capacity,
        feeAmount: input.feeAmount,
        currency: input.currency,
        status: input.status,
      },
      include: {
        _count: {
          select: {
            registrations: {
              where: { status: 'REGISTERED' },
            },
          },
        },
      },
    });

    return toCampusEvent(event);
  }

  async publish(tenant: TenantContext, eventId: string): Promise<CampusEvent> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, collegeId: tenant.collegeId },
      select: {
        id: true,
        organizerId: true,
        clubId: true,
        status: true,
      },
    });
    if (!event) throw new NotFoundException('Event not found.');
    await this.ensureCanManageEvent(tenant, event);
    if (!canTransitionEvent(event.status, 'PUBLISHED')) {
      throw new BadRequestException(
        `Cannot publish an event from ${event.status}.`,
      );
    }

    return this.update(tenant, eventId, { status: 'PUBLISHED' });
  }

  private async ensureRelatedRecordsBelongToTenant(
    tenant: TenantContext,
    input: Pick<CreateEventInput, 'clubId' | 'departmentId'>,
  ): Promise<void> {
    if (input.clubId) {
      const club = await this.prisma.club.findFirst({
        where: {
          id: input.clubId,
          collegeId: tenant.collegeId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!club)
        throw new NotFoundException('Club not found for this college.');
    }

    if (input.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: input.departmentId, collegeId: tenant.collegeId },
        select: { id: true },
      });
      if (!department)
        throw new NotFoundException('Department not found for this college.');
    }
  }

  private async ensureCanManageEvent(
    tenant: TenantContext,
    event: {
      organizerId: string;
      clubId: string | null;
      status: CampusEvent['status'];
    },
  ): Promise<void> {
    if (
      tenant.roles.includes('PLATFORM_ADMIN') ||
      tenant.roles.includes('COLLEGE_ADMIN') ||
      tenant.roles.includes('DEPARTMENT_ADMIN') ||
      event.organizerId === tenant.userId
    ) {
      return;
    }

    if (event.clubId && tenant.roles.includes('CLUB_ADMIN')) {
      const membership = await this.prisma.clubMembership.findFirst({
        where: {
          clubId: event.clubId,
          userId: tenant.userId,
          status: 'ACTIVE',
          role: { in: ['ADMIN', 'PRESIDENT', 'SECRETARY', 'LEAD'] },
        },
        select: { id: true },
      });
      if (membership) return;
    }

    throw new ForbiddenException('You cannot manage this event.');
  }

  private async uniqueEventSlug(
    collegeId: string,
    value: string,
    currentEventId?: string,
  ): Promise<string> {
    const root =
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 72) || `event-${randomUUID().slice(0, 8)}`;

    for (let index = 0; index < 5; index += 1) {
      const slug = index === 0 ? root : `${root}-${index + 1}`;
      const existing = await this.prisma.event.findUnique({
        where: { collegeId_slug: { collegeId, slug } },
        select: { id: true },
      });
      if (!existing || existing.id === currentEventId) return slug;
    }

    return `${root}-${randomUUID().slice(0, 8)}`;
  }
}
