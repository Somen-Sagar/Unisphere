/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */

import { NotFoundException } from '@nestjs/common';

import type { TenantContext } from '../common/tenant-context';
import { EventsService } from './events.service';

const tenant: TenantContext = {
  userId: 'user-a',
  collegeId: 'college-a',
  roles: ['CLUB_ADMIN'],
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
    const service = new EventsService(prisma as any);

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
    const service = new EventsService(prisma as any);

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

  it('creates events in the current tenant, not the submitted collegeId', async () => {
    const prisma = {
      event: {
        create: jest.fn().mockResolvedValue(eventRecord()),
      },
    };
    const service = new EventsService(prisma as any);

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
});
