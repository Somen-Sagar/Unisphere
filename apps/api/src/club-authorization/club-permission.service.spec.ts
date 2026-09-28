import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { TenantContext } from '../common/tenant-context';
import { ClubPermissionService } from './club-permission.service';

const tenant: TenantContext = {
  userId: 'user-a',
  collegeId: 'college-a',
  roles: ['STUDENT'],
  membershipIds: ['college-membership-a'],
  college: {
    id: 'college-a',
    name: 'College A',
    slug: 'college-a',
    city: null,
    state: null,
    logoUrl: null,
  },
};

describe('ClubPermissionService', () => {
  it('gives a lead operational access without giving the mentor the same powers', () => {
    const service = new ClubPermissionService({} as never);
    const lead = service.effectivePermissions('CLUB_LEAD', []);
    const mentor = service.effectivePermissions('CLUB_MENTOR', []);

    expect(lead).toEqual(
      expect.arrayContaining([
        'CLUB_CREATE_EVENT',
        'CLUB_MANAGE_MEMBERS',
        'CLUB_MANAGE_RECRUITMENT',
        'CLUB_POST_ANNOUNCEMENT',
        'CLUB_VIEW_REGISTRATIONS',
        'CLUB_VIEW_ANALYTICS',
      ]),
    );
    expect(mentor).toEqual(
      expect.arrayContaining([
        'CLUB_VIEW_MEMBERS',
        'CLUB_VIEW_REGISTRATIONS',
        'CLUB_VIEW_ANALYTICS',
      ]),
    );
    expect(mentor).not.toContain('CLUB_CREATE_EVENT');
    expect(mentor).not.toContain('CLUB_MANAGE_MEMBERS');
  });

  it('applies explicit grants and revocations over sub-lead defaults', () => {
    const service = new ClubPermissionService({} as never);
    const permissions = service.effectivePermissions('CLUB_SUB_LEAD', [
      { permission: 'CLUB_EDIT_PROFILE', effect: 'GRANT' },
      { permission: 'CLUB_MANAGE_MEMBERS', effect: 'REVOKE' },
    ]);

    expect(permissions).toContain('CLUB_EDIT_PROFILE');
    expect(permissions).not.toContain('CLUB_MANAGE_MEMBERS');
    expect(permissions).not.toContain('CLUB_MANAGE_PERMISSIONS');
  });

  it('denies create-event to a sub-lead until an explicit grant exists', async () => {
    const prisma = {
      club: { findFirst: jest.fn().mockResolvedValue({ id: 'club-a' }) },
      clubMembership: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'sub-lead-a',
            role: 'CLUB_SUB_LEAD',
            permissionOverrides: [],
          })
          .mockResolvedValueOnce({
            id: 'sub-lead-a',
            role: 'CLUB_SUB_LEAD',
            permissionOverrides: [
              { permission: 'CLUB_CREATE_EVENT', effect: 'GRANT' },
            ],
          }),
      },
    };
    const service = new ClubPermissionService(prisma as never);

    await expect(
      service.assert(tenant, 'club-a', 'CLUB_CREATE_EVENT'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assert(tenant, 'club-a', 'CLUB_CREATE_EVENT'),
    ).resolves.toMatchObject({
      role: 'CLUB_SUB_LEAD',
      canCreateEvent: true,
    });
  });

  it('keeps a club-level organizer out of club-wide operations', () => {
    const service = new ClubPermissionService({} as never);

    expect(service.effectivePermissions('ORGANIZER', [])).toEqual([]);
  });

  it('never resolves a club from another tenant', async () => {
    const prisma = {
      club: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ClubPermissionService(prisma as never);

    await expect(service.access(tenant, 'club-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.club.findFirst).toHaveBeenCalledWith({
      where: { id: 'club-b', collegeId: 'college-a' },
      select: { id: true },
    });
  });

  it('denies a student without an active club membership', async () => {
    const prisma = {
      club: { findFirst: jest.fn().mockResolvedValue({ id: 'club-a' }) },
      clubMembership: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ClubPermissionService(prisma as never);

    await expect(
      service.assert(tenant, 'club-a', 'CLUB_MANAGE_MEMBERS'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a contextual college admin manage only a tenant-validated club', async () => {
    const prisma = {
      club: { findFirst: jest.fn().mockResolvedValue({ id: 'club-a' }) },
    };
    const service = new ClubPermissionService(prisma as never);
    const access = await service.access(
      { ...tenant, roles: ['COLLEGE_ADMIN'] },
      'club-a',
    );

    expect(access.isCollegeAdmin).toBe(true);
    expect(access.permissions).toContain('CLUB_MANAGE_PERMISSIONS');
    expect(access.canCreateEvent).toBe(true);
  });
});
