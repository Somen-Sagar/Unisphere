import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CLUB_PERMISSIONS,
  type ClubAccess,
  type ClubAnnouncement,
  type ClubApplication,
  type ClubDashboardSummary,
  type ClubMember,
  type ClubMembershipRole,
  type ClubPermission,
} from '@unisphere/types';
import type {
  AddClubMemberInput,
  ClubMemberQueryInput,
  CreateClubAnnouncementInput,
  CreateClubApplicationInput,
  ReviewClubApplicationInput,
  SetClubPermissionInput,
  UpdateClubMemberInput,
} from '@unisphere/validation';

import { ClubPermissionService } from '../club-authorization/club-permission.service';
import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';

const protectedRoles: ClubMembershipRole[] = ['CLUB_MENTOR', 'CLUB_LEAD'];
const criticalPermissions: ClubPermission[] = [
  'CLUB_MANAGE_ROLES',
  'CLUB_MANAGE_PERMISSIONS',
];

@Injectable()
export class ClubManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: ClubPermissionService,
  ) {}

  access(tenant: TenantContext, clubId: string): Promise<ClubAccess> {
    return this.permissions.access(tenant, clubId);
  }

  async dashboard(
    tenant: TenantContext,
    clubId: string,
  ): Promise<ClubDashboardSummary> {
    const access = await this.permissions.access(tenant, clubId);
    const club = await this.prisma.club.findFirst({
      where: { id: clubId, collegeId: tenant.collegeId },
      include: {
        _count: {
          select: {
            memberships: { where: { status: 'ACTIVE' } },
            events: { where: { endsAt: { gte: new Date() } } },
          },
        },
      },
    });
    if (!club) throw new NotFoundException('Club not found.');

    const [pendingRequests, registrations, attendance, groupedRoles] =
      await this.prisma.$transaction([
        this.prisma.clubApplication.count({
          where: { collegeId: tenant.collegeId, clubId, status: 'PENDING' },
        }),
        this.prisma.eventRegistration.count({
          where: {
            collegeId: tenant.collegeId,
            event: { clubId, collegeId: tenant.collegeId },
            status: { not: 'CANCELLED' },
          },
        }),
        this.prisma.attendance.count({
          where: {
            collegeId: tenant.collegeId,
            event: { clubId },
            status: 'PRESENT',
          },
        }),
        this.prisma.clubMembership.findMany({
          where: { clubId, status: 'ACTIVE' },
          select: { role: true },
          orderBy: { role: 'asc' },
        }),
      ]);

    return {
      club: {
        id: club.id,
        collegeId: club.collegeId,
        departmentId: club.departmentId,
        name: club.name,
        slug: club.slug,
        description: club.description,
        category: club.category,
        logoUrl: club.logoUrl,
        coverUrl: club.coverUrl,
        recruitmentStatus: club.recruitmentStatus,
        verificationStatus: club.verificationStatus,
        upcomingEventCount: club._count.events,
        memberCount: club._count.memberships,
      },
      access,
      memberCount: club._count.memberships,
      pendingRequests,
      upcomingEvents: club._count.events,
      registrations,
      attendance,
      roleDistribution: [
        ...groupedRoles.reduce((counts, item) => {
          counts.set(item.role, (counts.get(item.role) ?? 0) + 1);
          return counts;
        }, new Map<ClubMembershipRole, number>()),
      ].map(([role, count]) => ({ role, count })),
    };
  }

  async members(
    tenant: TenantContext,
    clubId: string,
    query: ClubMemberQueryInput,
  ): Promise<ClubMember[]> {
    const access = await this.permissions.access(tenant, clubId);
    const sensitive =
      access.isCollegeAdmin ||
      access.role === 'CLUB_MENTOR' ||
      access.permissions.includes('CLUB_MANAGE_MEMBERS');
    const term = query.search?.trim();
    const memberships = await this.prisma.clubMembership.findMany({
      where: {
        clubId,
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.joinedFrom || query.joinedTo
          ? {
              joinedAt: {
                ...(query.joinedFrom
                  ? { gte: new Date(query.joinedFrom) }
                  : {}),
                ...(query.joinedTo ? { lte: new Date(query.joinedTo) } : {}),
              },
            }
          : {}),
        user: {
          memberships: {
            some: {
              collegeId: tenant.collegeId,
              status: 'ACTIVE',
              ...(query.departmentId
                ? { departmentId: query.departmentId }
                : {}),
              ...(query.academicYear
                ? { academicYear: query.academicYear }
                : {}),
            },
          },
          ...(term
            ? {
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                  ...(sensitive
                    ? [
                        {
                          email: {
                            contains: term,
                            mode: 'insensitive' as const,
                          },
                        },
                        {
                          memberships: {
                            some: {
                              collegeId: tenant.collegeId,
                              studentId: {
                                contains: term,
                                mode: 'insensitive' as const,
                              },
                            },
                          },
                        },
                      ]
                    : []),
                ],
              }
            : {}),
        },
      },
      include: this.memberInclude(tenant.collegeId, clubId),
      orderBy: [{ status: 'asc' }, { role: 'asc' }, { createdAt: 'asc' }],
    });
    return memberships.map((membership) =>
      this.toMember(membership, sensitive),
    );
  }

  async addMember(
    tenant: TenantContext,
    clubId: string,
    input: AddClubMemberInput,
  ): Promise<ClubMember> {
    await this.assertRoleAssignment(tenant, clubId, input.role);
    const collegeMembership = await this.prisma.collegeMembership.findFirst({
      where: {
        userId: input.userId,
        collegeId: tenant.collegeId,
        status: 'ACTIVE',
        ...(input.role === 'CLUB_MENTOR' ? { role: 'FACULTY' } : {}),
      },
      select: { id: true },
    });
    if (!collegeMembership) {
      throw new BadRequestException(
        input.role === 'CLUB_MENTOR'
          ? 'A mentor must be active faculty in this college.'
          : 'The user must be an active member of this college.',
      );
    }
    const existing = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId: input.userId } },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('This user already has a club membership.');

    const membership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clubMembership.create({
        data: {
          clubId,
          userId: input.userId,
          role: input.role,
          status: input.status,
          joinedAt: input.status === 'ACTIVE' ? new Date() : undefined,
        },
      });
      await tx.clubAuditLog.create({
        data: {
          collegeId: tenant.collegeId,
          clubId,
          actorId: tenant.userId,
          action:
            input.role === 'CLUB_MENTOR' ? 'MENTOR_ASSIGNED' : 'MEMBER_ADDED',
          targetId: created.id,
          metadata: { role: input.role, status: input.status },
        },
      });
      await tx.notification.create({
        data: {
          collegeId: tenant.collegeId,
          userId: input.userId,
          type: 'CLUB',
          title: 'Club role assigned',
          message: `You were assigned the ${input.role.replaceAll('_', ' ').toLowerCase()} role.`,
        },
      });
      return created;
    });
    return this.memberById(tenant, clubId, membership.id, true);
  }

  async updateMember(
    tenant: TenantContext,
    clubId: string,
    membershipId: string,
    input: UpdateClubMemberInput,
  ): Promise<ClubMember> {
    const target = await this.targetMembership(tenant, clubId, membershipId);
    const access = await this.permissions.access(tenant, clubId);
    if (
      (protectedRoles.includes(target.role) ||
        (input.role ? protectedRoles.includes(input.role) : false)) &&
      !access.isCollegeAdmin
    ) {
      throw new ForbiddenException(
        'Only a college admin can change club governance roles.',
      );
    }
    if (target.userId === tenant.userId && input.status) {
      throw new ForbiddenException(
        'You cannot change your own club membership status.',
      );
    }
    if (input.role) {
      await this.permissions.assert(tenant, clubId, 'CLUB_MANAGE_ROLES');
      await this.assertRoleAssignment(tenant, clubId, input.role);
      if (target.userId === tenant.userId) {
        throw new ForbiddenException(
          'You cannot change your own governance role.',
        );
      }
      if (input.role === 'CLUB_MENTOR') {
        const faculty = await this.prisma.collegeMembership.findFirst({
          where: {
            userId: target.userId,
            collegeId: tenant.collegeId,
            role: 'FACULTY',
            status: 'ACTIVE',
          },
          select: { id: true },
        });
        if (!faculty) {
          throw new BadRequestException(
            'A mentor must be active faculty in this college.',
          );
        }
      }
    }
    if (input.status === 'ACTIVE' && target.status !== 'ACTIVE') {
      input = { ...input };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.clubMembership.update({
        where: { id: membershipId },
        data: {
          role: input.role,
          status: input.status,
          ...(input.status === 'ACTIVE' && !target.joinedAt
            ? { joinedAt: new Date() }
            : {}),
        },
      });
      await tx.clubAuditLog.create({
        data: {
          collegeId: tenant.collegeId,
          clubId,
          actorId: tenant.userId,
          action: input.role ? 'ROLE_CHANGED' : 'MEMBERSHIP_STATUS_CHANGED',
          targetId: membershipId,
          metadata: {
            previousRole: target.role,
            role: input.role ?? target.role,
            previousStatus: target.status,
            status: input.status ?? target.status,
          },
        },
      });
      await tx.notification.create({
        data: {
          collegeId: tenant.collegeId,
          userId: target.userId,
          type: 'CLUB',
          title: input.role ? 'Club role updated' : 'Club membership updated',
          message: input.role
            ? `Your club role is now ${input.role.replaceAll('_', ' ').toLowerCase()}.`
            : `Your club membership is now ${input.status?.toLowerCase()}.`,
        },
      });
    });
    return this.memberById(tenant, clubId, membershipId, true);
  }

  async removeMember(
    tenant: TenantContext,
    clubId: string,
    membershipId: string,
  ): Promise<void> {
    const target = await this.targetMembership(tenant, clubId, membershipId);
    const access = await this.permissions.access(tenant, clubId);
    if (target.userId === tenant.userId) {
      throw new ForbiddenException(
        'You cannot remove your own club membership here.',
      );
    }
    if (protectedRoles.includes(target.role) && !access.isCollegeAdmin) {
      throw new ForbiddenException(
        'Only a college admin can remove club governance roles.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.clubMembership.delete({ where: { id: membershipId } }),
      this.prisma.clubAuditLog.create({
        data: {
          collegeId: tenant.collegeId,
          clubId,
          actorId: tenant.userId,
          action: 'MEMBER_REMOVED',
          targetId: membershipId,
          metadata: { userId: target.userId, role: target.role },
        },
      }),
      this.prisma.notification.create({
        data: {
          collegeId: tenant.collegeId,
          userId: target.userId,
          type: 'CLUB',
          title: 'Club membership removed',
          message: 'Your club membership was removed by an authorized manager.',
        },
      }),
    ]);
  }

  async setPermission(
    tenant: TenantContext,
    clubId: string,
    membershipId: string,
    permissionValue: string,
    input: SetClubPermissionInput,
  ): Promise<ClubMember> {
    if (!CLUB_PERMISSIONS.includes(permissionValue as ClubPermission)) {
      throw new BadRequestException('Unknown club permission.');
    }
    const permission = permissionValue as ClubPermission;
    const target = await this.targetMembership(tenant, clubId, membershipId);
    const access = await this.permissions.access(tenant, clubId);
    if (
      (criticalPermissions.includes(permission) ||
        protectedRoles.includes(target.role)) &&
      !access.isCollegeAdmin
    ) {
      throw new ForbiddenException(
        'Only a college admin can change this governance permission.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (input.effect === 'INHERIT') {
        await tx.clubPermissionOverride.deleteMany({
          where: { membershipId, permission },
        });
      } else {
        await tx.clubPermissionOverride.upsert({
          where: { membershipId_permission: { membershipId, permission } },
          create: {
            membershipId,
            permission,
            effect: input.effect,
            grantedById: tenant.userId,
          },
          update: { effect: input.effect, grantedById: tenant.userId },
        });
      }
      await tx.clubAuditLog.create({
        data: {
          collegeId: tenant.collegeId,
          clubId,
          actorId: tenant.userId,
          action:
            input.effect === 'INHERIT'
              ? 'PERMISSION_INHERITED'
              : input.effect === 'GRANT'
                ? 'PERMISSION_GRANTED'
                : 'PERMISSION_REVOKED',
          targetId: membershipId,
          metadata: { permission, effect: input.effect },
        },
      });
      await tx.notification.create({
        data: {
          collegeId: tenant.collegeId,
          userId: target.userId,
          type: 'CLUB',
          title: 'Club permission changed',
          message: `${permission.replaceAll('_', ' ').toLowerCase()} now uses ${input.effect.toLowerCase()}.`,
        },
      });
    });
    return this.memberById(tenant, clubId, membershipId, true);
  }

  async announcements(
    tenant: TenantContext,
    clubId: string,
  ): Promise<ClubAnnouncement[]> {
    await this.assertClub(tenant, clubId);
    const rows = await this.prisma.clubAnnouncement.findMany({
      where: { collegeId: tenant.collegeId, clubId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.toAnnouncement(row));
  }

  async createAnnouncement(
    tenant: TenantContext,
    clubId: string,
    input: CreateClubAnnouncementInput,
  ): Promise<ClubAnnouncement> {
    const row = await this.prisma.$transaction(async (tx) => {
      const announcement = await tx.clubAnnouncement.create({
        data: {
          collegeId: tenant.collegeId,
          clubId,
          createdById: tenant.userId,
          title: input.title,
          content: input.content,
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      await tx.clubAuditLog.create({
        data: {
          collegeId: tenant.collegeId,
          clubId,
          actorId: tenant.userId,
          action: 'ANNOUNCEMENT_POSTED',
          targetId: announcement.id,
        },
      });
      const recipients = await tx.clubMembership.findMany({
        where: {
          clubId,
          status: 'ACTIVE',
          userId: { not: tenant.userId },
        },
        select: { userId: true },
      });
      if (recipients.length) {
        await tx.notification.createMany({
          data: recipients.map(({ userId }) => ({
            collegeId: tenant.collegeId,
            userId,
            type: 'CLUB' as const,
            title: input.title,
            message: input.content,
          })),
        });
      }
      return announcement;
    });
    return this.toAnnouncement(row);
  }

  async apply(
    tenant: TenantContext,
    clubId: string,
    input: CreateClubApplicationInput,
  ): Promise<ClubApplication> {
    const club = await this.prisma.club.findFirst({
      where: {
        id: clubId,
        collegeId: tenant.collegeId,
        isActive: true,
        recruitmentStatus: 'OPEN',
      },
      select: { id: true },
    });
    if (!club) throw new ConflictException('Club recruitment is not open.');
    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId: tenant.userId } },
      select: { status: true },
    });
    if (membership?.status === 'ACTIVE') {
      throw new ConflictException('You are already an active club member.');
    }
    const row = await this.prisma.clubApplication.upsert({
      where: { clubId_userId: { clubId, userId: tenant.userId } },
      create: {
        collegeId: tenant.collegeId,
        clubId,
        userId: tenant.userId,
        answers: input.answers,
      },
      update: {
        answers: input.answers,
        status: 'PENDING',
        reviewedAt: null,
        reviewedById: null,
      },
    });
    return this.toApplication(row);
  }

  async applications(
    tenant: TenantContext,
    clubId: string,
  ): Promise<ClubApplication[]> {
    const rows = await this.prisma.clubApplication.findMany({
      where: { collegeId: tenant.collegeId, clubId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toApplication(row));
  }

  async reviewApplication(
    tenant: TenantContext,
    clubId: string,
    applicationId: string,
    input: ReviewClubApplicationInput,
  ): Promise<ClubApplication> {
    const application = await this.prisma.clubApplication.findFirst({
      where: { id: applicationId, clubId, collegeId: tenant.collegeId },
    });
    if (!application)
      throw new NotFoundException('Club application not found.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.clubApplication.update({
        where: { id: applicationId },
        data: {
          status: input.status,
          reviewedAt: new Date(),
          reviewedById: tenant.userId,
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      });
      if (input.status === 'APPROVED') {
        await tx.clubMembership.upsert({
          where: { clubId_userId: { clubId, userId: application.userId } },
          create: {
            clubId,
            userId: application.userId,
            role: 'MEMBER',
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
          update: { status: 'ACTIVE', role: 'MEMBER', joinedAt: new Date() },
        });
      }
      await tx.notification.create({
        data: {
          collegeId: tenant.collegeId,
          userId: application.userId,
          type: 'CLUB',
          title: `Club application ${input.status.toLowerCase()}`,
          message: `Your club application was ${input.status.toLowerCase()}.`,
        },
      });
      await tx.clubAuditLog.create({
        data: {
          collegeId: tenant.collegeId,
          clubId,
          actorId: tenant.userId,
          action: `APPLICATION_${input.status}`,
          targetId: applicationId,
          metadata: { applicantUserId: application.userId },
        },
      });
      return row;
    });
    return this.toApplication(updated);
  }

  private async assertRoleAssignment(
    tenant: TenantContext,
    clubId: string,
    role: ClubMembershipRole,
  ): Promise<void> {
    const access = await this.permissions.access(tenant, clubId);
    if (protectedRoles.includes(role) && !access.isCollegeAdmin) {
      throw new ForbiddenException(
        'Only a college admin can assign mentor or lead roles.',
      );
    }
  }

  private async assertClub(
    tenant: TenantContext,
    clubId: string,
  ): Promise<void> {
    const club = await this.prisma.club.findFirst({
      where: { id: clubId, collegeId: tenant.collegeId },
      select: { id: true },
    });
    if (!club) throw new NotFoundException('Club not found.');
  }

  private async targetMembership(
    tenant: TenantContext,
    clubId: string,
    membershipId: string,
  ) {
    const membership = await this.prisma.clubMembership.findFirst({
      where: {
        id: membershipId,
        clubId,
        club: { collegeId: tenant.collegeId },
      },
    });
    if (!membership) throw new NotFoundException('Club member not found.');
    return membership;
  }

  private memberInclude(collegeId: string, clubId: string) {
    return {
      permissionOverrides: true,
      user: {
        include: {
          memberships: {
            where: { collegeId, status: 'ACTIVE' as const },
            include: { department: true },
          },
          eventAssignments: {
            where: { event: { clubId } },
            select: { id: true },
          },
          registrations: {
            where: {
              event: { clubId },
              attendance: { status: 'PRESENT' as const },
            },
            select: { id: true },
          },
        },
      },
    };
  }

  private async memberById(
    tenant: TenantContext,
    clubId: string,
    membershipId: string,
    sensitive: boolean,
  ): Promise<ClubMember> {
    const membership = await this.prisma.clubMembership.findFirst({
      where: {
        id: membershipId,
        clubId,
        club: { collegeId: tenant.collegeId },
      },
      include: this.memberInclude(tenant.collegeId, clubId),
    });
    if (!membership) throw new NotFoundException('Club member not found.');
    return this.toMember(membership, sensitive);
  }

  private toMember(
    membership: {
      id: string;
      userId: string;
      role: ClubMembershipRole;
      status: ClubMember['status'];
      joinedAt: Date | null;
      permissionOverrides: Array<{
        permission: ClubPermission;
        effect: 'GRANT' | 'REVOKE';
      }>;
      user: {
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
        memberships: Array<{
          studentId: string | null;
          academicYear: number | null;
          semester: number | null;
          department: { id: string; name: string; code: string } | null;
        }>;
        eventAssignments: Array<{ id: string }>;
        registrations: Array<{ id: string }>;
      };
    },
    sensitive: boolean,
  ): ClubMember {
    const collegeMembership = membership.user.memberships[0];
    return {
      id: membership.id,
      userId: membership.userId,
      fullName: `${membership.user.firstName} ${membership.user.lastName}`,
      email: sensitive ? membership.user.email : null,
      avatarUrl: membership.user.avatarUrl,
      studentId: sensitive ? (collegeMembership?.studentId ?? null) : null,
      department: collegeMembership?.department ?? null,
      academicYear: collegeMembership?.academicYear ?? null,
      semester: collegeMembership?.semester ?? null,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt?.toISOString() ?? null,
      permissions: sensitive
        ? this.permissions.permissionDetails(
            membership.role,
            membership.permissionOverrides,
          )
        : [],
      eventsOrganized: membership.user.eventAssignments.length,
      attendanceCount: membership.user.registrations.length,
    };
  }

  private toAnnouncement(row: {
    id: string;
    clubId: string;
    title: string;
    content: string;
    publishedAt: Date;
    createdBy: { id: string; firstName: string; lastName: string };
  }): ClubAnnouncement {
    return {
      id: row.id,
      clubId: row.clubId,
      title: row.title,
      content: row.content,
      publishedAt: row.publishedAt.toISOString(),
      author: row.createdBy,
    };
  }

  private toApplication(row: {
    id: string;
    clubId: string;
    userId: string;
    answers: unknown;
    status: ClubApplication['status'];
    createdAt: Date;
    user?: { firstName: string; lastName: string; email: string };
  }): ClubApplication {
    return {
      id: row.id,
      clubId: row.clubId,
      userId: row.userId,
      answers: row.answers,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      applicant: row.user,
    };
  }
}
