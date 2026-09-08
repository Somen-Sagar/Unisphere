/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { NotFoundException } from '@nestjs/common';

import type { TenantContext } from '../common/tenant-context';
import { RegistrationsService } from './registrations.service';

jest.mock('@unisphere/business-rules', () => ({
  isRegistrationAvailable: jest.fn(() => true),
}));

const tenant: TenantContext = {
  userId: 'student-a',
  collegeId: 'college-a',
  roles: ['STUDENT'],
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

describe('RegistrationsService tenant isolation', () => {
  it('does not register a tenant user for an event outside their college', async () => {
    const transaction = {
      event: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const service = new RegistrationsService(prisma as any);

    await expect(service.register(tenant, 'event-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(transaction.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'event-b',
          collegeId: 'college-a',
        },
      }),
    );
  });

  it('does not return registrations outside the current tenant', async () => {
    const prisma = {
      eventRegistration: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new RegistrationsService(prisma as any);

    await service.findMine(tenant);

    expect(prisma.eventRegistration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'student-a',
          status: { not: 'CANCELLED' },
          event: { collegeId: 'college-a' },
        },
      }),
    );
  });
});
