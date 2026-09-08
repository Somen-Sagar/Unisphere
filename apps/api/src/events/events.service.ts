import { Injectable, NotFoundException } from '@nestjs/common';
import type { CampusEvent, PaginatedResponse } from '@unisphere/types';
import type { CreateEventInput, EventQueryInput } from '@unisphere/validation';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';
import { toCampusEvent } from './event.mapper';

const publicStatuses = [
  'PUBLISHED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'ONGOING',
  'COMPLETED',
] as const;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenant: TenantContext,
    query: EventQueryInput,
  ): Promise<PaginatedResponse<CampusEvent>> {
    const where = {
      collegeId: tenant.collegeId,
      status: { in: [...publicStatuses] },
      ...(query.upcoming ? { endsAt: { gte: new Date() } } : {}),
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
      items: events.map(toCampusEvent),
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

    const event = await this.prisma.event.create({
      data: {
        collegeId: tenant.collegeId,
        clubId: input.clubId,
        organizerId: tenant.userId,
        title: input.title,
        description: input.description,
        venue: input.venue,
        imageUrl: input.imageUrl,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        registrationOpensAt: input.registrationOpensAt
          ? new Date(input.registrationOpensAt)
          : undefined,
        registrationClosesAt: input.registrationClosesAt
          ? new Date(input.registrationClosesAt)
          : undefined,
        capacity: input.capacity,
        status: 'PENDING_APPROVAL',
      },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    return toCampusEvent(event);
  }
}
