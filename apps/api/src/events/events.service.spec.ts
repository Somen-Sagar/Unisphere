/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { TenantContext } from '../common/tenant-context';
import { EventsService } from './events.service';

const tenant: TenantContext = {
  userId: 'user-a',
  collegeId: 'college-a',
  roles: ['COLLEGE_ADMIN'],
  membershipIds: ['membership-a'],
  college: {
    id: 'college-a',
    name: 'College A',
    slug: 'college-a',
    city: null,
    state: null,
    logoUrl: null,
  },
};

function eventRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-a',
    collegeId: 'college-a',
    clubId: null,
    title: 'Tenant Event',
    description: 'Tenant scoped event description.',
    venue: 'Hall A',
    imageUrl: null,
    startsAt: new Date('2026-10-01T10:00:00.000Z'),
    endsAt: new Date('2026-10-01T12:00:00.000Z'),
    registrationOpensAt: null,
    registrationClosesAt: null,
    capacity: 100,
    status: 'REGISTRATION_OPEN',
    _count: { registrations: 0 },
    ...overrides,
  };
}

describe('EventsService tenant isolation', () => {
  it('ignores query collegeId and scopes event lists to the current tenant', async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[eventRecord()], 1]),
      event: {
        findMany: jest.fn().mockReturnValue('find-many-query'),
        count: jest.fn().mockReturnValue('count-query'),
      },
    };
    const service = new EventsService(
      prisma as any,
      { assert: jest.fn(), assertEvent: jest.fn() } as any,
    );

    await expect(
      service.findAll(tenant, {
        collegeId: 'college-b',
        page: 1,
        pageSize: 20,
        upcoming: true,
      }),
    ).resolves.toMatchObject({ total: 1 });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ collegeId: 'college-a' }),
      }),
    );
    expect(prisma.event.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ collegeId: 'college-a' }),
    });
  });

  it('loads event details only inside the current tenant', async () => {
    const prisma = {
      event: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new EventsService(
      prisma as any,
      { assert: jest.fn(), assertEvent: jest.fn() } as any,
    );

    await expect(service.findOne(tenant, 'event-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'event-b',
          collegeId: 'college-a',
        }),
      }),
    );
  });

  it('keeps private-event authorization when a search term is present', async () => {
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[], 0]),
      event: {
        findMany: jest.fn().mockReturnValue('find-many-query'),
        count: jest.fn().mockReturnValue('count-query'),
      },
    };
    const service = new EventsService(prisma as any, {} as any);

    await service.findAll(
      { ...tenant, roles: ['STUDENT'] },
      {
        status: 'DRAFT',
        search: 'private',
        page: 1,
        pageSize: 20,
        upcoming: false,
      },
    );

    const call = prisma.event.findMany.mock.calls[0][0];
    expect(call.where.AND).toHaveLength(2);
    expect(call.where.AND[0]).toHaveProperty('OR');
    expect(call.where.AND[1]).toHaveProperty('OR');
  });

  it('creates events in the current tenant, not the submitted collegeId', async () => {
    const prisma = {
      event: {
        create: jest.fn().mockResolvedValue(eventRecord()),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new EventsService(
      prisma as any,
      { assert: jest.fn(), assertEvent: jest.fn() } as any,
    );

    await service.create(tenant, {
      collegeId: 'college-b',
      title: 'Tenant Event',
      description: 'A valid event created by an authorized tenant admin.',
      venue: 'Hall A',
      startsAt: '2026-10-01T10:00:00.000Z',
      endsAt: '2026-10-01T12:00:00.000Z',
    });

    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collegeId: 'college-a',
          organizerId: 'user-a',
        }),
      }),
    );
  });

  it('lets a club lead create a competition through CLUB_CREATE_EVENT', async () => {
    const prisma = {
      club: {
        findFirst: jest.fn().mockResolvedValue({ id: 'club-a' }),
      },
      event: {
        create: jest.fn().mockResolvedValue(
          eventRecord({
            clubId: 'club-a',
            eventType: 'COMPETITION',
          }),
        ),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const permissions = {
      assert: jest.fn().mockResolvedValue({
        role: 'CLUB_LEAD',
        permissions: ['CLUB_CREATE_EVENT'],
      }),
    };
    const service = new EventsService(prisma as any, permissions as any);

    await service.create(
      { ...tenant, roles: ['STUDENT'] },
      {
        clubId: 'club-a',
        title: 'Inter College Coding Competition',
        description:
          'A valid competition created by the operational club lead.',
        eventType: 'COMPETITION',
        venue: 'Innovation Hall',
        startsAt: '2026-10-01T10:00:00.000Z',
        endsAt: '2026-10-01T12:00:00.000Z',
      },
    );

    expect(permissions.assert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-a', collegeId: 'college-a' }),
      'club-a',
      'CLUB_CREATE_EVENT',
    );
    expect(prisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clubId: 'club-a',
          eventType: 'COMPETITION',
          organizerId: 'user-a',
        }),
      }),
    );
  });

  it('does not let an event editor approve their own club event', async () => {
    const prisma = {
      event: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'event-a',
          organizerId: 'user-a',
          clubId: 'club-a',
          status: 'PENDING_APPROVAL',
          title: 'Approval Required',
        }),
        update: jest.fn(),
      },
    };
    const permissions = {
      assertEvent: jest.fn().mockResolvedValue({ clubId: 'club-a' }),
      access: jest.fn().mockResolvedValue({
        membershipId: 'club-membership-a',
        role: 'CLUB_LEAD',
        permissions: ['CLUB_EDIT_EVENT'],
        isCollegeAdmin: false,
      }),
    };
    const service = new EventsService(prisma as any, permissions as any);

    await expect(
      service.update({ ...tenant, roles: ['STUDENT'] }, 'event-a', {
        status: 'APPROVED',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('keeps mentor review advisory and organizer permissions event-specific', async () => {
    const prisma = {
      event: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            clubId: 'club-a',
            organizerId: 'lead-a',
            organizers: [],
          })
          .mockResolvedValueOnce({
            clubId: 'club-a',
            organizerId: 'lead-a',
            organizers: [
              {
                permissions: ['VIEW_REGISTRATIONS', 'MARK_ATTENDANCE'],
              },
            ],
          }),
      },
    };
    const clubPermissions = {
      access: jest
        .fn()
        .mockResolvedValueOnce({
          role: 'CLUB_MENTOR',
          permissions: [
            'CLUB_VIEW_MEMBERS',
            'CLUB_VIEW_REGISTRATIONS',
            'CLUB_VIEW_ANALYTICS',
          ],
        })
        .mockResolvedValueOnce({ role: null, permissions: [] }),
    };
    const service = new EventsService(prisma as any, clubPermissions as any);

    await expect(
      service.access(
        { ...tenant, userId: 'mentor-a', roles: ['FACULTY'] },
        'event-a',
      ),
    ).resolves.toMatchObject({
      canReview: true,
      canPublish: false,
      permissions: ['VIEW_REGISTRATIONS'],
    });
    await expect(
      service.access(
        { ...tenant, userId: 'organizer-a', roles: ['STUDENT'] },
        'event-a',
      ),
    ).resolves.toMatchObject({
      canReview: false,
      canPublish: false,
      permissions: ['VIEW_REGISTRATIONS', 'MARK_ATTENDANCE'],
    });
  });

  it('requires create permission before moving an event to another club', async () => {
    const prisma = {
      event: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'event-a',
          organizerId: 'user-a',
          clubId: 'club-a',
          status: 'DRAFT',
          title: 'Club A Event',
        }),
        update: jest.fn(),
      },
      club: {
        findFirst: jest.fn().mockResolvedValue({ id: 'club-b' }),
      },
    };
    const permissions = {
      assertEvent: jest.fn().mockResolvedValue({ clubId: 'club-a' }),
      assert: jest.fn().mockRejectedValue(new ForbiddenException()),
    };
    const service = new EventsService(prisma as any, permissions as any);

    await expect(
      service.update({ ...tenant, roles: ['STUDENT'] }, 'event-a', {
        clubId: 'club-b',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(permissions.assert).toHaveBeenCalledWith(
      expect.objectContaining({ collegeId: 'college-a' }),
      'club-b',
      'CLUB_CREATE_EVENT',
    );
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
});
