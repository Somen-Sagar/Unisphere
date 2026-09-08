import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isRegistrationAvailable } from '@unisphere/business-rules';
import type { EventRegistration } from '@unisphere/types';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';
import { toCampusEvent } from '../events/event.mapper';

const managementRoles = [
  'CLUB_ADMIN',
  'DEPARTMENT_ADMIN',
  'COLLEGE_ADMIN',
  'PLATFORM_ADMIN',
] as const;

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    tenant: TenantContext,
    eventId: string,
  ): Promise<EventRegistration> {
    return this.prisma.$transaction(async (transaction) => {
      const event = await transaction.event.findFirst({
        where: { id: eventId, collegeId: tenant.collegeId },
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

      const campusEvent = toCampusEvent(event);
      if (!isRegistrationAvailable(campusEvent)) {
        throw new ConflictException('Registration is not currently available.');
      }

      const existing = await transaction.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId: tenant.userId } },
        include: {
          event: {
            include: {
              _count: {
                select: {
                  registrations: {
                    where: { status: 'REGISTERED' },
                  },
                },
              },
            },
          },
        },
      });
      if (existing?.status === 'REGISTERED')
        return this.toRegistration(existing);

      const registration = await transaction.eventRegistration.upsert({
        where: { eventId_userId: { eventId, userId: tenant.userId } },
        update: { status: 'REGISTERED', checkedInAt: null, checkedInBy: null },
        create: { eventId, userId: tenant.userId },
        include: {
          event: {
            include: {
              _count: {
                select: {
                  registrations: {
                    where: { status: 'REGISTERED' },
                  },
                },
              },
            },
          },
        },
      });

      return this.toRegistration(registration);
    });
  }

  async findMine(tenant: TenantContext): Promise<EventRegistration[]> {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        userId: tenant.userId,
        status: { not: 'CANCELLED' },
        event: { collegeId: tenant.collegeId },
      },
      include: {
        event: {
          include: {
            _count: {
              select: {
                registrations: {
                  where: { status: 'REGISTERED' },
                },
              },
            },
          },
        },
      },
      orderBy: { event: { startsAt: 'asc' } },
    });

    return registrations.map((registration) =>
      this.toRegistration(registration),
    );
  }

  async scan(
    tenant: TenantContext,
    qrToken: string,
  ): Promise<EventRegistration> {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { qrToken },
      include: {
        event: {
          include: {
            _count: {
              select: {
                registrations: {
                  where: { status: 'REGISTERED' },
                },
              },
            },
          },
        },
      },
    });
    if (!registration || registration.status !== 'REGISTERED') {
      throw new NotFoundException('This registration pass is not valid.');
    }
    if (registration.checkedInAt) {
      throw new ConflictException(
        'This registration has already been checked in.',
      );
    }

    const authorized = await this.prisma.collegeMembership.findFirst({
      where: {
        userId: tenant.userId,
        collegeId: tenant.collegeId,
        status: 'ACTIVE',
        role: { in: [...managementRoles] },
      },
      select: { id: true },
    });
    if (!authorized) {
      throw new ForbiddenException(
        'You are not authorized to scan this event.',
      );
    }

    if (registration.event.collegeId !== tenant.collegeId) {
      throw new NotFoundException('This registration pass is not valid.');
    }

    const updated = await this.prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { checkedInAt: new Date(), checkedInBy: tenant.userId },
      include: {
        event: {
          include: {
            _count: {
              select: {
                registrations: {
                  where: { status: 'REGISTERED' },
                },
              },
            },
          },
        },
      },
    });
    return this.toRegistration(updated);
  }

  private toRegistration(registration: {
    id: string;
    eventId: string;
    status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
    qrToken: string;
    checkedInAt: Date | null;
    event: Parameters<typeof toCampusEvent>[0];
  }): EventRegistration {
    return {
      id: registration.id,
      eventId: registration.eventId,
      status: registration.status,
      qrToken: registration.qrToken,
      checkedInAt: registration.checkedInAt?.toISOString() ?? null,
      event: toCampusEvent(registration.event),
    };
  }
}
