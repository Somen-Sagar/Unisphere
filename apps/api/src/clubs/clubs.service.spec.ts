import { ForbiddenException } from '@nestjs/common';

import type { TenantContext } from '../common/tenant-context';
import { ClubsService } from './clubs.service';

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

describe('ClubsService governance authorization', () => {
  it('creates a student proposal as pending with a club-scoped lead role', async () => {
    type CreateClubArgs = {
      data: {
        collegeId: string;
        verificationStatus: string;
        memberships?: {
          create: { userId: string; role: string; status: string };
        };
      };
    };
    const created = {
      id: 'club-new',
      collegeId: 'college-a',
      departmentId: null,
      name: 'New Society',
      slug: 'new-society',
      description: 'A student-led club proposal.',
      category: 'Academic',
      logoUrl: null,
      coverUrl: null,
      recruitmentStatus: 'CLOSED',
      verificationStatus: 'PENDING',
      _count: { memberships: 1, events: 0 },
    };
    const createClub = jest.fn((args: CreateClubArgs) => {
      void args;
      return Promise.resolve(created);
    });
    const prisma = {
      club: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createClub,
      },
    };
    const service = new ClubsService(prisma as never, {} as never);

    await expect(
      service.create(tenant, {
        name: 'New Society',
        description: 'A student-led club proposal.',
        category: 'Academic',
        recruitmentStatus: 'CLOSED',
      }),
    ).resolves.toMatchObject({
      id: 'club-new',
      verificationStatus: 'PENDING',
    });
    expect(createClub).toHaveBeenCalledTimes(1);
    expect(createClub.mock.calls[0]?.[0].data).toMatchObject({
      collegeId: 'college-a',
      verificationStatus: 'PENDING',
      memberships: {
        create: {
          userId: 'lead-a',
          role: 'CLUB_LEAD',
          status: 'ACTIVE',
        },
      },
    });
  });

  it('does not let a profile editor approve or suspend a club', async () => {
    const prisma = {
      club: {
        findFirst: jest.fn().mockResolvedValue({ id: 'club-a' }),
        update: jest.fn(),
      },
    };
    const service = new ClubsService(prisma as never, {} as never);

    await expect(
      service.update(tenant, 'club-a', { verificationStatus: 'VERIFIED' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.club.update).not.toHaveBeenCalled();
  });
});
