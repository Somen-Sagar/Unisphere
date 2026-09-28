import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { defaultClubPermissions } from '@unisphere/business-rules';
import {
  CLUB_PERMISSIONS,
  type ClubAccess,
  type ClubMemberPermission,
  type ClubMembershipRole,
  type ClubPermission,
  type EventOrganizerPermission,
} from '@unisphere/types';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';

type PermissionOverride = {
  permission: ClubPermission;
  effect: 'GRANT' | 'REVOKE';
};

@Injectable()
export class ClubPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async access(tenant: TenantContext, clubId: string): Promise<ClubAccess> {
    const club = await this.prisma.club.findFirst({
      where: { id: clubId, collegeId: tenant.collegeId },
      select: { id: true },
    });
    if (!club) throw new NotFoundException('Club not found.');

    const isCollegeAdmin = tenant.roles.some((role) =>
      ['COLLEGE_ADMIN', 'PLATFORM_ADMIN'].includes(role),
    );
    if (isCollegeAdmin) {
      return this.toAccess(null, null, [...CLUB_PERMISSIONS], true);
    }

    const membership = await this.prisma.clubMembership.findFirst({
      where: { clubId, userId: tenant.userId, status: 'ACTIVE' },
      include: { permissionOverrides: true },
    });
    if (!membership) {
      return this.toAccess(null, null, [], false);
    }

    return this.toAccess(
      membership.id,
      membership.role,
      this.effectivePermissions(
        membership.role,
        membership.permissionOverrides,
      ),
      false,
    );
  }

  async assert(
    tenant: TenantContext,
    clubId: string,
    permission: ClubPermission,
  ): Promise<ClubAccess> {
    const access = await this.access(tenant, clubId);
    if (!access.permissions.includes(permission)) {
      throw new ForbiddenException(
        `Club permission ${permission} is required.`,
      );
    }
    return access;
  }

  async assertEvent(
    tenant: TenantContext,
    eventId: string,
    clubPermission: ClubPermission,
    organizerPermission?: EventOrganizerPermission,
  ): Promise<{ clubId: string | null }> {
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
    if (
      tenant.roles.includes('COLLEGE_ADMIN') ||
      tenant.roles.includes('PLATFORM_ADMIN') ||
      (Boolean(organizerPermission) && event.organizerId === tenant.userId)
    ) {
      return { clubId: event.clubId };
    }
    if (
      organizerPermission &&
      event.organizers.some((assignment) =>
        assignment.permissions.includes(organizerPermission),
      )
    ) {
      return { clubId: event.clubId };
    }
    if (event.clubId) {
      await this.assert(tenant, event.clubId, clubPermission);
      return { clubId: event.clubId };
    }
    throw new ForbiddenException('You cannot manage this event.');
  }

  effectivePermissions(
    role: ClubMembershipRole,
    overrides: PermissionOverride[],
  ): ClubPermission[] {
    const effective = new Set(defaultClubPermissions(role));
    for (const override of overrides) {
      if (override.effect === 'GRANT') effective.add(override.permission);
      else effective.delete(override.permission);
    }
    return [...effective];
  }

  permissionDetails(
    role: ClubMembershipRole,
    overrides: PermissionOverride[],
  ): ClubMemberPermission[] {
    const inherited = new Set(defaultClubPermissions(role));
    const overrideMap = new Map(
      overrides.map(
        (override) => [override.permission, override.effect] as const,
      ),
    );
    return CLUB_PERMISSIONS.map((permission) => {
      const override = overrideMap.get(permission) ?? null;
      return {
        permission,
        inherited: inherited.has(permission),
        override,
        effective:
          override === 'GRANT' ||
          (override !== 'REVOKE' && inherited.has(permission)),
      };
    });
  }

  private toAccess(
    membershipId: string | null,
    role: ClubMembershipRole | null,
    permissions: ClubPermission[],
    isCollegeAdmin: boolean,
  ): ClubAccess {
    const has = (permission: ClubPermission) =>
      permissions.includes(permission);
    const canManageMembers = has('CLUB_MANAGE_MEMBERS');
    const canCreateEvent = has('CLUB_CREATE_EVENT');
    const canManageRecruitment = has('CLUB_MANAGE_RECRUITMENT');
    const canPostAnnouncement = has('CLUB_POST_ANNOUNCEMENT');
    const canManageRegistrations = has('CLUB_MANAGE_REGISTRATIONS');
    const canMarkAttendance = has('CLUB_MARK_ATTENDANCE');
    const canEditProfile = has('CLUB_EDIT_PROFILE');

    return {
      membershipId,
      role,
      permissions,
      isCollegeAdmin,
      canManageClub:
        isCollegeAdmin ||
        canManageMembers ||
        canCreateEvent ||
        canManageRecruitment ||
        canPostAnnouncement ||
        canManageRegistrations ||
        canMarkAttendance ||
        canEditProfile,
      canCreateEvent,
      canManageMembers,
      canManageRecruitment,
      canPostAnnouncement,
      canViewRegistrations: has('CLUB_VIEW_REGISTRATIONS'),
      canManageRegistrations,
      canMarkAttendance,
      canViewAnalytics: has('CLUB_VIEW_ANALYTICS'),
      canEditProfile,
      canReviewEvents: isCollegeAdmin || role === 'CLUB_MENTOR',
    };
  }
}
