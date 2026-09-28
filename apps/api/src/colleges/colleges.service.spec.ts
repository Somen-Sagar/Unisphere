import { ForbiddenException } from '@nestjs/common';

import type { TenantContext } from '../common/tenant-context';
import { CollegesService } from './colleges.service';

const tenant: TenantContext = {
  userId: 'admin-a',
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

describe('CollegesService tenant isolation', () => {
  it('does not let a college admin broadcast into another tenant', async () => {
    const prisma = {
      collegeMembership: { findMany: jest.fn() },
      notification: { createMany: jest.fn() },
    };
    const service = new CollegesService(prisma as never);

    await expect(
      service.announce(tenant, 'college-b', {
        title: 'Cross-tenant notice',
        message: 'This must not be delivered.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.collegeMembership.findMany).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
