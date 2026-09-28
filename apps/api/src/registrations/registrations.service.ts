import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isRegistrationAvailable } from '@unisphere/business-rules';
import type { AttendanceRecord, EventRegistration } from '@unisphere/types';
import { randomBytes } from 'node:crypto';

import type { TenantContext } from '../common/tenant-context';
import { ClubPermissionService } from '../club-authorization/club-permission.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { toCampusEvent } from '../events/event.mapper';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubPermissions: ClubPermissionService,
  ) {}

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
      if (existing?.status === 'REGISTERED') {
        throw new ConflictException(
          'You are already registered for this event.',
        );
      }

      const registration = await transaction.eventRegistration.upsert({
        where: { eventId_userId: { eventId, userId: tenant.userId } },
        update: {
          status: 'REGISTERED',
          cancelledAt: null,
          registeredAt: new Date(),
          checkedInAt: null,
          checkedInBy: null,
        },
        create: {
          collegeId: tenant.collegeId,
          eventId,
          userId: tenant.userId,
          registrationCode: this.registrationCode(),
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
      });

      await transaction.notification.create({
        data: {
          collegeId: tenant.collegeId,
          userId: tenant.userId,
          type: 'REGISTRATION',
          title: 'Event registration confirmed',
          message: `Your registration for ${event.title} is confirmed.`,
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

  async cancel(
    tenant: TenantContext,
    eventId: string,
  ): Promise<EventRegistration> {
    const registration = await this.prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId: tenant.userId,
        collegeId: tenant.collegeId,
        status: 'REGISTERED',
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
    });
    if (!registration) throw new NotFoundException('Registration not found.');
    if (registration.event.status === 'CANCELLED') {
      throw new ConflictException('This event is already cancelled.');
    }

    const updated = await this.prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
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

  async findForEvent(
    tenant: TenantContext,
    eventId: string,
  ): Promise<EventRegistration[]> {
    await this.clubPermissions.assertEvent(
      tenant,
      eventId,
      'CLUB_VIEW_REGISTRATIONS',
      'VIEW_REGISTRATIONS',
    );

    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId,
        collegeId: tenant.collegeId,
        event: { collegeId: tenant.collegeId },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
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
      orderBy: { registeredAt: 'desc' },
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

    if (registration.event.collegeId !== tenant.collegeId) {
      throw new NotFoundException('This registration pass is not valid.');
    }
    await this.clubPermissions.assertEvent(
      tenant,
      registration.eventId,
      'CLUB_MARK_ATTENDANCE',
      'MARK_ATTENDANCE',
    );

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.attendance.upsert({
        where: { registrationId: registration.id },
        create: {
          collegeId: tenant.collegeId,
          eventId: registration.eventId,
          registrationId: registration.id,
          checkedInById: tenant.userId,
          checkedInAt: now,
          method: 'QR',
        },
        update: {
          checkedInById: tenant.userId,
          checkedInAt: now,
          method: 'QR',
          status: 'PRESENT',
        },
      });
      return tx.eventRegistration.update({
        where: { id: registration.id },
        data: { checkedInAt: now, checkedInBy: tenant.userId },
        include: {
          event: {
            include: {
              _count: {
                select: { registrations: { where: { status: 'REGISTERED' } } },
              },
            },
          },
        },
      });
    });
    return this.toRegistration(updated);
  }

  async manualCheckIn(
    tenant: TenantContext,
    eventId: string,
    registrationId: string,
  ): Promise<AttendanceRecord> {
    await this.clubPermissions.assertEvent(
      tenant,
      eventId,
      'CLUB_MARK_ATTENDANCE',
      'MARK_ATTENDANCE',
    );
    const registration = await this.prisma.eventRegistration.findFirst({
      where: {
        id: registrationId,
        eventId,
        collegeId: tenant.collegeId,
        status: 'REGISTERED',
        event: { collegeId: tenant.collegeId },
      },
      select: { id: true, checkedInAt: true },
    });
    if (!registration)
      throw new NotFoundException('Active registration not found.');
    if (registration.checkedInAt) {
      throw new ConflictException(
        'This registration has already been checked in.',
      );
    }
    const now = new Date();
    let attendance;
    try {
      attendance = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.eventRegistration.updateMany({
          where: { id: registrationId, checkedInAt: null },
          data: { checkedInAt: now, checkedInBy: tenant.userId },
        });
        if (updated.count !== 1) {
          throw new ConflictException(
            'This registration has already been checked in.',
          );
        }
        return tx.attendance.create({
          data: {
            collegeId: tenant.collegeId,
            eventId,
            registrationId,
            checkedInById: tenant.userId,
            checkedInAt: now,
            method: 'MANUAL',
          },
        });
      });
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null
          ? (error as { code?: unknown }).code
          : undefined;
      if (error instanceof ConflictException || errorCode === 'P2002') {
        throw new ConflictException(
          'This registration has already been checked in.',
        );
      }
      throw error;
    }
    return {
      id: attendance.id,
      eventId: attendance.eventId,
      registrationId: attendance.registrationId,
      checkedInById: attendance.checkedInById,
      checkedInAt: attendance.checkedInAt.toISOString(),
      method: attendance.method,
      status: attendance.status,
    };
  }

  private toRegistration(registration: {
    id: string;
    eventId: string;
    status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';
    registrationCode: string;
    qrToken: string;
    registeredAt: Date;
    cancelledAt: Date | null;
    checkedInAt: Date | null;
    event: Parameters<typeof toCampusEvent>[0];
    user?: { id: string; firstName: string; lastName: string; email: string };
  }): EventRegistration {
    return {
      id: registration.id,
      eventId: registration.eventId,
      status: registration.status,
      registrationCode: registration.registrationCode,
      qrToken: registration.qrToken,
      registeredAt: registration.registeredAt.toISOString(),
      cancelledAt: registration.cancelledAt?.toISOString() ?? null,
      checkedInAt: registration.checkedInAt?.toISOString() ?? null,
      event: toCampusEvent(registration.event),
      registrant: registration.user,
    };
  }

  private registrationCode(): string {
    return `UNI-${randomBytes(5).toString('hex').toUpperCase()}`;
  }
}
