import { Injectable, NotFoundException } from '@nestjs/common';
import type { CampusClub, CampusClubDetails } from '@unisphere/types';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';
import { toCampusEvent } from '../events/event.mapper';

const publicEventStatuses = [
  'PUBLISHED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'ONGOING',
] as const;

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenant: TenantContext): Promise<CampusClub[]> {
    const now = new Date();
    const clubs = await this.prisma.club.findMany({
      where: {
        collegeId: tenant.collegeId,
        isActive: true,
        college: { status: 'VERIFIED' },
      },
      include: {
        _count: {
          select: {
            events: {
              where: {
                status: { in: [...publicEventStatuses] },
                endsAt: { gte: now },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clubs.map((club) => ({
      id: club.id,
      collegeId: club.collegeId,
      name: club.name,
      slug: club.slug,
      description: club.description,
      logoUrl: club.logoUrl,
      upcomingEventCount: club._count.events,
    }));
  }

  async findOne(
    tenant: TenantContext,
    clubId: string,
  ): Promise<CampusClubDetails> {
    const now = new Date();
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        collegeId: tenant.collegeId,
        isActive: true,
        college: { status: 'VERIFIED' },
      },
      include: {
        events: {
          where: {
            status: { in: [...publicEventStatuses] },
            endsAt: { gte: now },
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
          orderBy: { startsAt: 'asc' },
          take: 10,
        },
      },
    });
    if (!club) throw new NotFoundException('Club not found.');

    return {
      id: club.id,
      collegeId: club.collegeId,
      name: club.name,
      slug: club.slug,
      description: club.description,
      logoUrl: club.logoUrl,
      upcomingEventCount: club.events.length,
      upcomingEvents: club.events.map(toCampusEvent),
    };
  }
}
