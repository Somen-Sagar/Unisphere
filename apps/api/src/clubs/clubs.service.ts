import { Injectable, NotFoundException } from '@nestjs/common';
import type { CampusClub, CampusClubDetails } from '@unisphere/types';
import type { CreateClubInput, UpdateClubInput } from '@unisphere/validation';
import { randomUUID } from 'node:crypto';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';
import { toCampusEvent } from '../events/event.mapper';

const publicEventStatuses = [
  'APPROVED',
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
        verificationStatus: 'VERIFIED',
      },
      include: {
        _count: {
          select: {
            memberships: { where: { status: 'ACTIVE' } },
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

    return clubs.map((club) => this.toClub(club));
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
        verificationStatus: 'VERIFIED',
      },
      include: {
        _count: {
          select: {
            memberships: { where: { status: 'ACTIVE' } },
            events: {
              where: {
                status: { in: [...publicEventStatuses] },
                endsAt: { gte: now },
              },
            },
          },
        },
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
      ...this.toClub(club),
      upcomingEvents: club.events.map(toCampusEvent),
    };
  }

  async create(
    tenant: TenantContext,
    input: CreateClubInput,
  ): Promise<CampusClub> {
    if (input.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: input.departmentId, collegeId: tenant.collegeId },
        select: { id: true },
      });
      if (!department)
        throw new NotFoundException('Department not found for this college.');
    }

    const club = await this.prisma.club.create({
      data: {
        collegeId: tenant.collegeId,
        departmentId: input.departmentId,
        name: input.name,
        slug: await this.uniqueClubSlug(
          tenant.collegeId,
          input.slug ?? input.name,
        ),
        description: input.description,
        category: input.category,
        logoUrl: input.logoUrl,
        coverUrl: input.coverUrl,
        recruitmentStatus: input.recruitmentStatus,
        verificationStatus: tenant.roles.includes('COLLEGE_ADMIN')
          ? 'VERIFIED'
          : 'PENDING',
        memberships: {
          create: {
            userId: tenant.userId,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        _count: { select: { memberships: true, events: true } },
      },
    });

    return this.toClub(club);
  }

  async update(
    tenant: TenantContext,
    clubId: string,
    input: UpdateClubInput,
  ): Promise<CampusClub> {
    const club = await this.prisma.club.findFirst({
      where: { id: clubId, collegeId: tenant.collegeId },
      select: { id: true },
    });
    if (!club) throw new NotFoundException('Club not found.');

    if (input.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: input.departmentId, collegeId: tenant.collegeId },
        select: { id: true },
      });
      if (!department)
        throw new NotFoundException('Department not found for this college.');
    }

    const updated = await this.prisma.club.update({
      where: { id: clubId },
      data: {
        departmentId: input.departmentId,
        name: input.name,
        ...(input.slug
          ? {
              slug: await this.uniqueClubSlug(
                tenant.collegeId,
                input.slug,
                clubId,
              ),
            }
          : {}),
        description: input.description,
        category: input.category,
        logoUrl: input.logoUrl,
        coverUrl: input.coverUrl,
        recruitmentStatus: input.recruitmentStatus,
        verificationStatus: input.verificationStatus,
        isActive: input.isActive,
      },
      include: {
        _count: {
          select: {
            memberships: { where: { status: 'ACTIVE' } },
            events: {
              where: {
                status: { in: [...publicEventStatuses] },
                endsAt: { gte: new Date() },
              },
            },
          },
        },
      },
    });

    return this.toClub(updated);
  }

  private toClub(club: {
    id: string;
    collegeId: string;
    departmentId: string | null;
    name: string;
    slug: string;
    description: string | null;
    category: string;
    logoUrl: string | null;
    coverUrl: string | null;
    recruitmentStatus: CampusClub['recruitmentStatus'];
    verificationStatus: CampusClub['verificationStatus'];
    _count: { events: number; memberships?: number };
  }): CampusClub {
    return {
      id: club.id,
      collegeId: club.collegeId,
      departmentId: club.departmentId,
      name: club.name,
      slug: club.slug,
      description: club.description,
      category: club.category,
      logoUrl: club.logoUrl,
      coverUrl: club.coverUrl,
      recruitmentStatus: club.recruitmentStatus,
      verificationStatus: club.verificationStatus,
      upcomingEventCount: club._count.events,
      memberCount: club._count.memberships,
    };
  }

  private async uniqueClubSlug(
    collegeId: string,
    value: string,
    currentClubId?: string,
  ): Promise<string> {
    const root =
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 72) || `club-${randomUUID().slice(0, 8)}`;

    for (let index = 0; index < 5; index += 1) {
      const slug = index === 0 ? root : `${root}-${index + 1}`;
      const existing = await this.prisma.club.findUnique({
        where: { collegeId_slug: { collegeId, slug } },
        select: { id: true },
      });
      if (!existing || existing.id === currentClubId) return slug;
    }

    return `${root}-${randomUUID().slice(0, 8)}`;
  }
}
