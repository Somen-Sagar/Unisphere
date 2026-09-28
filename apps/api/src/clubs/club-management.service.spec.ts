import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { TenantContext } from '../common/tenant-context';
import { ClubManagementService } from './club-management.service';

const tenant: TenantContext = {
  userId: 'lead-a',
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

describe('ClubManagementService governance boundaries', () => {
  it('does not let a lead suspend a protected mentor membership', async () => {
    const prisma = {
      clubMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mentor-membership',
          userId: 'mentor-a',
          role: 'CLUB_MENTOR',
          status: 'ACTIVE',
          joinedAt: new Date(),
        }),
      },
    };
    const permissions = {
      access: jest.fn().mockResolvedValue({ isCollegeAdmin: false }),
    };
    const service = new ClubManagementService(
      prisma as never,
      permissions as never,
    );

    await expect(
      service.updateMember(tenant, 'club-a', 'mentor-membership', {
        status: 'SUSPENDED',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires active same-college faculty when changing a member to mentor', async () => {
    const prisma = {
      clubMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'member-a',
          userId: 'student-a',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        }),
      },
      collegeMembership: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const permissions = {
      access: jest.fn().mockResolvedValue({ isCollegeAdmin: true }),
      assert: jest.fn(),
    };
    const service = new ClubManagementService(
      prisma as never,
      permissions as never,
    );

    await expect(
      service.updateMember(
        { ...tenant, roles: ['COLLEGE_ADMIN'] },
        'club-a',
        'member-a',
        { role: 'CLUB_MENTOR' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
