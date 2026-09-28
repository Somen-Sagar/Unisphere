import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canTransitionEvent } from '@unisphere/business-rules';
import type {
  CampusEvent,
  EventAccess,
  EventOrganizerPermission,
  EventOrganizer,
  PaginatedResponse,
} from '@unisphere/types';
import type {
  AssignEventOrganizerInput,
  CreateEventInput,
  EventQueryInput,
  UpdateEventInput,
} from '@unisphere/validation';
import { randomUUID } from 'node:crypto';

import type { TenantContext } from '../common/tenant-context';
import { ClubPermissionService } from '../club-authorization/club-permission.service';
import { PrismaService } from '../database/prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly clubPermissions: ClubPermissionService,
  ) {}

  async findAll(
    tenant: TenantContext,
    query: EventQueryInput,
  ): Promise<PaginatedResponse<CampusEvent>> {
    const requestsPrivateStatus = Boolean(
      query.status &&
      !publicStatuses.includes(query.status as (typeof publicStatuses)[number]),
    );
    const tenantAdmin = tenant.roles.some((role) =>
      ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
    );
    const constraints: Prisma.EventWhereInput[] = [];
    if (requestsPrivateStatus && !tenantAdmin) {
      constraints.push({
        OR: [
          { organizerId: tenant.userId },
          { organizers: { some: { userId: tenant.userId } } },
          {
            club: {
              memberships: {
                some: {
                  userId: tenant.userId,
                  status: 'ACTIVE' as const,
                  role: {
                    in: [
                      'CLUB_MENTOR' as const,
                      'CLUB_LEAD' as const,
                      'CLUB_SUB_LEAD' as const,
                      'ADMIN' as const,
                      'PRESIDENT' as const,
                      'LEAD' as const,
                    ],
                  },
                },
              },
            },
          },
        ],
      });
    }
    if (query.search) {
      constraints.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' as const } },
          {
            description: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          },
          { venue: { contains: query.search, mode: 'insensitive' as const } },
          {
            eventType: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          },
        ],
      });
    }
    const where: Prisma.EventWhereInput = {
      collegeId: tenant.collegeId,
      status: query.status ? query.status : { in: [...publicStatuses] },
      ...(constraints.length ? { AND: constraints } : {}),
      ...(query.upcoming ? { endsAt: { gte: new Date() } } : {}),
      ...(query.clubId ? { clubId: query.clubId } : {}),
      ...(query.category ? { eventType: query.category } : {}),
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
    if (
      !publicStatuses.includes(event.status as (typeof publicStatuses)[number])
    ) {
      const tenantAdmin = tenant.roles.some((role) =>
        ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
      );
      let authorized = tenantAdmin || event.organizerId === tenant.userId;
      if (!authorized && event.clubId) {
        const access = await this.clubPermissions.access(tenant, event.clubId);
        authorized =
          access.permissions.includes('CLUB_EDIT_EVENT') ||
          access.permissions.includes('CLUB_VIEW_ANALYTICS');
      }
      if (!authorized) {
        const assignment = await this.prisma.eventOrganizer.findFirst({
          where: { eventId, userId: tenant.userId },
          select: { id: true },
        });
        authorized = Boolean(assignment);
      }
      if (!authorized) throw new NotFoundException('Event not found.');
    }
    return toCampusEvent(event);
  }

  async access(tenant: TenantContext, eventId: string): Promise<EventAccess> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, collegeId: tenant.collegeId },
      select: {
        clubId: true,
        organizerId: true,
        organizers: {
          where: { userId: tenant.userId },
          select: { permissions: true },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found.');

    const isTenantAdmin = tenant.roles.some((role) =>
      ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
    );
    const isPrimaryOrganizer = event.organizerId === tenant.userId;
    const delegated = new Set<EventOrganizerPermission>(
      event.organizers.flatMap((item) => item.permissions),
    );
    let clubAccess = null;
    if (event.clubId) {
      clubAccess = await this.clubPermissions.access(tenant, event.clubId);
    }

    const allEventPermissions: EventOrganizerPermission[] = [
      'EDIT_EVENT',
      'VIEW_REGISTRATIONS',
      'MANAGE_REGISTRATIONS',
      'MARK_ATTENDANCE',
      'SEND_EVENT_NOTIFICATION',
    ];
    if (isTenantAdmin || isPrimaryOrganizer) {
      allEventPermissions.forEach((permission) => delegated.add(permission));
    }
    if (clubAccess?.permissions.includes('CLUB_EDIT_EVENT'))
      delegated.add('EDIT_EVENT');
    if (clubAccess?.permissions.includes('CLUB_VIEW_REGISTRATIONS'))
      delegated.add('VIEW_REGISTRATIONS');
    if (clubAccess?.permissions.includes('CLUB_MANAGE_REGISTRATIONS'))
      delegated.add('MANAGE_REGISTRATIONS');
    if (clubAccess?.permissions.includes('CLUB_MARK_ATTENDANCE'))
      delegated.add('MARK_ATTENDANCE');
    if (clubAccess?.permissions.includes('CLUB_POST_ANNOUNCEMENT'))
      delegated.add('SEND_EVENT_NOTIFICATION');

    return {
      isTenantAdmin,
      isPrimaryOrganizer,
      canReview:
        tenant.roles.some((role) =>
          ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
        ) || clubAccess?.role === 'CLUB_MENTOR',
      canPublish:
        isTenantAdmin ||
        Boolean(clubAccess?.permissions.includes('CLUB_PUBLISH_EVENT')),
      canManageOrganizers:
        isTenantAdmin ||
        isPrimaryOrganizer ||
        Boolean(clubAccess?.permissions.includes('CLUB_MANAGE_REGISTRATIONS')),
      permissions: allEventPermissions.filter((permission) =>
        delegated.has(permission),
      ),
    };
  }

  async create(
    tenant: TenantContext,
    input: CreateEventInput,
  ): Promise<CampusEvent> {
    await this.ensureRelatedRecordsBelongToTenant(tenant, input);
    if (input.clubId) {
      await this.clubPermissions.assert(
        tenant,
        input.clubId,
        'CLUB_CREATE_EVENT',
      );
    } else if (
      !tenant.roles.some((role) =>
        ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
      )
    ) {
      throw new ForbiddenException('You cannot create this event.');
    }

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
        status: 'DRAFT',
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
        title: true,
      },
    });
    if (!existing) throw new NotFoundException('Event not found.');

    const statusChanges = Boolean(
      input.status && input.status !== existing.status,
    );
    const contentChanges = Object.entries(input).some(
      ([key, value]) => key !== 'status' && value !== undefined,
    );
    if (!statusChanges || contentChanges) {
      await this.ensureCanManageEvent(tenant, existing);
    }

    if (
      statusChanges &&
      input.status &&
      !canTransitionEvent(existing.status, input.status)
    ) {
      throw new BadRequestException(
        `Cannot transition event from ${existing.status} to ${input.status}.`,
      );
    }
    if (statusChanges && input.status) {
      await this.ensureCanTransitionStatus(tenant, existing, input.status);
    }

    await this.ensureRelatedRecordsBelongToTenant(tenant, input);
    if (input.clubId && input.clubId !== existing.clubId) {
      await this.clubPermissions.assert(
        tenant,
        input.clubId,
        'CLUB_CREATE_EVENT',
      );
    }

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

    if (statusChanges && input.status) {
      await this.recordStatusChange(tenant, existing, input.status);
    } else if (contentChanges) {
      await this.notifyRegisteredUsers(
        tenant,
        existing.id,
        'Event updated',
        `${event.title} has new event details.`,
      );
    }

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
    await this.clubPermissions.assertEvent(
      tenant,
      eventId,
      'CLUB_PUBLISH_EVENT',
    );
    if (!canTransitionEvent(event.status, 'PUBLISHED')) {
      throw new BadRequestException(
        `Cannot publish an event from ${event.status}.`,
      );
    }

    return this.update(tenant, eventId, { status: 'PUBLISHED' });
  }

  async organizers(
    tenant: TenantContext,
    eventId: string,
  ): Promise<EventOrganizer[]> {
    await this.clubPermissions.assertEvent(
      tenant,
      eventId,
      'CLUB_VIEW_REGISTRATIONS',
      'VIEW_REGISTRATIONS',
    );
    const rows = await this.prisma.eventOrganizer.findMany({
      where: { eventId, event: { collegeId: tenant.collegeId } },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    });
    return rows.map((row) => this.toOrganizer(row));
  }

  async assignOrganizer(
    tenant: TenantContext,
    eventId: string,
    input: AssignEventOrganizerInput,
  ): Promise<EventOrganizer> {
    const { clubId } = await this.assertCanManageOrganizers(tenant, eventId);
    const userInCollege = await this.prisma.collegeMembership.findFirst({
      where: {
        collegeId: tenant.collegeId,
        userId: input.userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!userInCollege) {
      throw new BadRequestException(
        'Organizer must be an active member of this college.',
      );
    }
    if (clubId) {
      const clubMember = await this.prisma.clubMembership.findFirst({
        where: { clubId, userId: input.userId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!clubMember) {
        throw new BadRequestException(
          'Organizer must be an active member of this club.',
        );
      }
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.eventOrganizer.upsert({
        where: { eventId_userId: { eventId, userId: input.userId } },
        create: {
          eventId,
          userId: input.userId,
          role: input.role,
          permissions: input.permissions,
        },
        update: { role: input.role, permissions: input.permissions },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });
      await tx.notification.create({
        data: {
          collegeId: tenant.collegeId,
          userId: input.userId,
          type: 'EVENT',
          title: 'Event organizer assignment',
          message: `You were assigned as ${input.role.toLowerCase().replaceAll('_', ' ')}.`,
        },
      });
      if (clubId) {
        await tx.clubAuditLog.create({
          data: {
            collegeId: tenant.collegeId,
            clubId,
            actorId: tenant.userId,
            action: 'EVENT_ORGANIZER_ASSIGNED',
            targetId: assignment.id,
            metadata: { eventId, userId: input.userId, role: input.role },
          },
        });
      }
      return assignment;
    });
    return this.toOrganizer(row);
  }

  async removeOrganizer(
    tenant: TenantContext,
    eventId: string,
    userId: string,
  ): Promise<void> {
    const { clubId } = await this.assertCanManageOrganizers(tenant, eventId);
    const assignment = await this.prisma.eventOrganizer.findFirst({
      where: { eventId, userId, event: { collegeId: tenant.collegeId } },
      select: { id: true },
    });
    if (!assignment)
      throw new NotFoundException('Event organizer assignment not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.eventOrganizer.delete({ where: { id: assignment.id } });
      if (clubId) {
        await tx.clubAuditLog.create({
          data: {
            collegeId: tenant.collegeId,
            clubId,
            actorId: tenant.userId,
            action: 'EVENT_ORGANIZER_REMOVED',
            targetId: assignment.id,
            metadata: { eventId, userId },
          },
        });
      }
    });
  }

  async remove(tenant: TenantContext, eventId: string): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, collegeId: tenant.collegeId },
      select: {
        id: true,
        organizerId: true,
        clubId: true,
        status: true,
        title: true,
      },
    });
    if (!event) throw new NotFoundException('Event not found.');
    if (!['DRAFT', 'REJECTED', 'CANCELLED'].includes(event.status)) {
      throw new ConflictException(
        'Only draft, rejected, or cancelled events can be deleted.',
      );
    }
    await this.clubPermissions.assertEvent(
      tenant,
      eventId,
      'CLUB_DELETE_EVENT',
    );

    await this.prisma.$transaction(async (tx) => {
      if (event.clubId) {
        await tx.clubAuditLog.create({
          data: {
            collegeId: tenant.collegeId,
            clubId: event.clubId,
            actorId: tenant.userId,
            action: 'EVENT_DELETED',
            targetId: eventId,
            metadata: { title: event.title, status: event.status },
          },
        });
      }
      await tx.event.delete({ where: { id: eventId } });
    });
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

  private async assertCanManageOrganizers(
    tenant: TenantContext,
    eventId: string,
  ): Promise<{ clubId: string | null }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, collegeId: tenant.collegeId },
      select: { clubId: true, organizerId: true },
    });
    if (!event) throw new NotFoundException('Event not found.');
    if (
      event.organizerId === tenant.userId ||
      tenant.roles.some((role) =>
        ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
      )
    ) {
      return { clubId: event.clubId };
    }
    if (event.clubId) {
      await this.clubPermissions.assert(
        tenant,
        event.clubId,
        'CLUB_MANAGE_REGISTRATIONS',
      );
      return { clubId: event.clubId };
    }
    throw new ForbiddenException('You cannot manage event organizers.');
  }

  private async ensureCanManageEvent(
    tenant: TenantContext,
    event: {
      id: string;
      organizerId: string;
      clubId: string | null;
      status: CampusEvent['status'];
    },
  ): Promise<void> {
    await this.clubPermissions.assertEvent(
      tenant,
      event.id,
      'CLUB_EDIT_EVENT',
      'EDIT_EVENT',
    );
  }

  private async ensureCanTransitionStatus(
    tenant: TenantContext,
    event: {
      id: string;
      organizerId: string;
      clubId: string | null;
      status: CampusEvent['status'];
    },
    nextStatus: CampusEvent['status'],
  ): Promise<void> {
    const tenantAdmin = tenant.roles.some((role) =>
      ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
    );

    if (['APPROVED', 'REJECTED'].includes(nextStatus)) {
      if (tenantAdmin) return;
      if (event.clubId) {
        const access = await this.clubPermissions.access(tenant, event.clubId);
        if (access.role === 'CLUB_MENTOR') return;
      }
      throw new ForbiddenException(
        'Only a college administrator or assigned club mentor can review this event.',
      );
    }

    if (nextStatus === 'PUBLISHED') {
      await this.clubPermissions.assertEvent(
        tenant,
        event.id,
        'CLUB_PUBLISH_EVENT',
      );
      return;
    }

    await this.ensureCanManageEvent(tenant, event);
  }

  private async recordStatusChange(
    tenant: TenantContext,
    event: {
      id: string;
      clubId: string | null;
      status: CampusEvent['status'];
      title: string;
    },
    nextStatus: CampusEvent['status'],
  ): Promise<void> {
    if (event.clubId) {
      await this.prisma.clubAuditLog.create({
        data: {
          collegeId: tenant.collegeId,
          clubId: event.clubId,
          actorId: tenant.userId,
          action:
            nextStatus === 'APPROVED'
              ? 'EVENT_APPROVED'
              : nextStatus === 'REJECTED'
                ? 'EVENT_REJECTED'
                : 'EVENT_STATUS_CHANGED',
          targetId: event.id,
          metadata: { from: event.status, to: nextStatus },
        },
      });
    }

    const recipientIds = new Set<string>();
    if (nextStatus === 'PENDING_APPROVAL') {
      const [admins, mentors] = await Promise.all([
        this.prisma.collegeMembership.findMany({
          where: {
            collegeId: tenant.collegeId,
            status: 'ACTIVE',
            role: { in: ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'] },
          },
          select: { userId: true },
        }),
        event.clubId
          ? this.prisma.clubMembership.findMany({
              where: {
                clubId: event.clubId,
                status: 'ACTIVE',
                role: 'CLUB_MENTOR',
              },
              select: { userId: true },
            })
          : Promise.resolve([]),
      ]);
      [...admins, ...mentors].forEach(({ userId }) => recipientIds.add(userId));
    } else {
      const registrations = await this.prisma.eventRegistration.findMany({
        where: {
          eventId: event.id,
          collegeId: tenant.collegeId,
          status: { not: 'CANCELLED' },
        },
        select: { userId: true },
      });
      registrations.forEach(({ userId }) => recipientIds.add(userId));
    }
    recipientIds.delete(tenant.userId);

    if (recipientIds.size) {
      await this.prisma.notification.createMany({
        data: [...recipientIds].map((userId) => ({
          collegeId: tenant.collegeId,
          userId,
          type: 'EVENT' as const,
          title:
            nextStatus === 'PENDING_APPROVAL'
              ? 'Event approval required'
              : 'Event updated',
          message: `${event.title} is now ${nextStatus.replaceAll('_', ' ').toLowerCase()}.`,
        })),
      });
    }
  }

  private async notifyRegisteredUsers(
    tenant: TenantContext,
    eventId: string,
    title: string,
    message: string,
  ): Promise<void> {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId,
        collegeId: tenant.collegeId,
        status: { not: 'CANCELLED' },
        userId: { not: tenant.userId },
      },
      select: { userId: true },
    });
    if (!registrations.length) return;
    await this.prisma.notification.createMany({
      data: registrations.map(({ userId }) => ({
        collegeId: tenant.collegeId,
        userId,
        type: 'EVENT' as const,
        title,
        message,
      })),
    });
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

  private toOrganizer(row: {
    id: string;
    eventId: string;
    userId: string;
    role: string;
    permissions: EventOrganizer['permissions'];
    assignedAt: Date;
    user: EventOrganizer['user'];
  }): EventOrganizer {
    return {
      id: row.id,
      eventId: row.eventId,
      userId: row.userId,
      role: row.role,
      permissions: row.permissions,
      assignedAt: row.assignedAt.toISOString(),
      user: row.user,
    };
  }
}
