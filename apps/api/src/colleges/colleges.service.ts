import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CollegeAnnouncementResult,
  CollegeDetails,
  CollegeAdminSummary,
  CollegeSummary,
  CampusClub,
  Membership,
} from '@unisphere/types';
import type {
  CreateCollegeAnnouncementInput,
  CreateCollegeInput,
  UpdateCollegeInput,
  UpdateCollegeMembershipInput,
} from '@unisphere/validation';
import { randomUUID } from 'node:crypto';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class CollegesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CollegeSummary[]> {
    return this.prisma.college.findMany({
      where: { status: 'VERIFIED' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        logoUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string): Promise<CollegeDetails> {
    const college = await this.prisma.college.findUnique({ where: { slug } });
    if (!college || college.status === 'SUSPENDED') {
      throw new NotFoundException('College not found.');
    }
    return this.toDetails(college);
  }

  async create(
    userId: string,
    input: CreateCollegeInput,
  ): Promise<CollegeDetails> {
    const slug = await this.uniqueCollegeSlug(input.slug ?? input.name);
    const college = await this.prisma.$transaction(async (tx) => {
      const created = await tx.college.create({
        data: {
          name: input.name,
          slug,
          website: input.website,
          officialEmailDomain: input.officialEmailDomain,
          city: input.city,
          state: input.state,
          country: input.country,
          description: input.description,
          status: 'PENDING',
        },
      });
      await tx.collegeMembership.create({
        data: {
          userId,
          collegeId: created.id,
          role: 'COLLEGE_ADMIN',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
      return created;
    });
    return this.toDetails(college);
  }

  async update(
    tenant: TenantContext,
    collegeId: string,
    input: UpdateCollegeInput,
  ): Promise<CollegeDetails> {
    this.assertTenantAdmin(tenant, collegeId);
    if (input.slug) {
      const existing = await this.prisma.college.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (existing && existing.id !== collegeId) {
        throw new ConflictException('This college slug is already in use.');
      }
    }

    const college = await this.prisma.college.update({
      where: { id: collegeId },
      data: input,
    });
    return this.toDetails(college);
  }

  async members(
    tenant: TenantContext,
    collegeId: string,
  ): Promise<Membership[]> {
    this.assertTenantAdmin(tenant, collegeId);
    const memberships = await this.prisma.collegeMembership.findMany({
      where: { collegeId },
      include: {
        college: true,
        department: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return memberships.map((membership) => this.toMembership(membership));
  }

  async adminSummary(
    tenant: TenantContext,
    collegeId: string,
  ): Promise<CollegeAdminSummary> {
    this.assertTenantAdmin(tenant, collegeId);
    const [
      students,
      faculty,
      clubs,
      events,
      activeMemberships,
      pendingMemberships,
      pendingClubs,
      pendingEvents,
    ] = await this.prisma.$transaction([
      this.prisma.collegeMembership.count({
        where: { collegeId, role: 'STUDENT', status: 'ACTIVE' },
      }),
      this.prisma.collegeMembership.count({
        where: { collegeId, role: 'FACULTY', status: 'ACTIVE' },
      }),
      this.prisma.club.count({ where: { collegeId, isActive: true } }),
      this.prisma.event.count({ where: { collegeId } }),
      this.prisma.collegeMembership.count({
        where: { collegeId, status: 'ACTIVE' },
      }),
      this.prisma.collegeMembership.count({
        where: { collegeId, status: 'PENDING' },
      }),
      this.prisma.club.count({
        where: { collegeId, verificationStatus: 'PENDING' },
      }),
      this.prisma.event.count({
        where: { collegeId, status: 'PENDING_APPROVAL' },
      }),
    ]);
    return {
      students,
      faculty,
      clubs,
      events,
      activeMemberships,
      pendingMemberships,
      pendingClubs,
      pendingEvents,
    };
  }

  async adminClubs(
    tenant: TenantContext,
    collegeId: string,
  ): Promise<CampusClub[]> {
    this.assertTenantAdmin(tenant, collegeId);
    const clubs = await this.prisma.club.findMany({
      where: { collegeId },
      include: {
        _count: {
          select: {
            memberships: { where: { status: 'ACTIVE' } },
            events: { where: { endsAt: { gte: new Date() } } },
          },
        },
      },
      orderBy: [{ verificationStatus: 'asc' }, { name: 'asc' }],
    });
    return clubs.map((club) => ({
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
    }));
  }

  async announce(
    tenant: TenantContext,
    collegeId: string,
    input: CreateCollegeAnnouncementInput,
  ): Promise<CollegeAnnouncementResult> {
    this.assertTenantAdmin(tenant, collegeId);
    const recipients = await this.prisma.collegeMembership.findMany({
      where: {
        collegeId,
        status: 'ACTIVE',
        userId: { not: tenant.userId },
      },
      distinct: ['userId'],
      select: { userId: true },
    });
    if (!recipients.length) return { delivered: 0 };

    const result = await this.prisma.notification.createMany({
      data: recipients.map(({ userId }) => ({
        collegeId,
        userId,
        type: 'COLLEGE' as const,
        title: input.title,
        message: input.message,
      })),
    });
    return { delivered: result.count };
  }

  async updateMember(
    tenant: TenantContext,
    collegeId: string,
    membershipId: string,
    input: UpdateCollegeMembershipInput,
  ): Promise<Membership> {
    this.assertTenantAdmin(tenant, collegeId);
    const existing = await this.prisma.collegeMembership.findFirst({
      where: { id: membershipId, collegeId },
      select: { id: true, userId: true, role: true, status: true },
    });
    if (!existing) throw new NotFoundException('College membership not found.');
    if (
      existing.userId === tenant.userId &&
      (input.status === 'SUSPENDED' ||
        (input.role && input.role !== existing.role))
    ) {
      throw new ForbiddenException(
        'You cannot suspend or demote your own active membership.',
      );
    }
    if (input.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: input.departmentId, collegeId },
        select: { id: true },
      });
      if (!department)
        throw new NotFoundException('Department not found for this college.');
    }
    const updated = await this.prisma.collegeMembership.update({
      where: { id: membershipId },
      data: {
        status: input.status,
        role: input.role,
        departmentId: input.departmentId,
        academicYear: input.academicYear,
        semester: input.semester,
        ...(input.status === 'ACTIVE' ? { joinedAt: new Date() } : {}),
      },
      include: {
        college: true,
        department: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    return this.toMembership(updated);
  }

  private toMembership(membership: {
    id: string;
    collegeId: string;
    role: Membership['role'];
    status: Membership['status'];
    studentId: string | null;
    departmentId: string | null;
    academicYear: number | null;
    semester: number | null;
    college: {
      id: string;
      name: string;
      slug: string;
      city: string | null;
      state: string | null;
      logoUrl: string | null;
      status: Membership['college']['status'];
    };
    department: { id: string; name: string; code: string } | null;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
  }): Membership {
    return {
      id: membership.id,
      collegeId: membership.collegeId,
      role: membership.role,
      status: membership.status,
      studentId: membership.studentId,
      departmentId: membership.departmentId,
      academicYear: membership.academicYear,
      semester: membership.semester,
      department: membership.department,
      user: membership.user,
      college: {
        id: membership.college.id,
        name: membership.college.name,
        slug: membership.college.slug,
        city: membership.college.city,
        state: membership.college.state,
        logoUrl: membership.college.logoUrl,
        status: membership.college.status,
      },
    };
  }

  private assertTenantAdmin(tenant: TenantContext, collegeId: string): void {
    const allowed =
      tenant.collegeId === collegeId &&
      (tenant.roles.includes('COLLEGE_ADMIN') ||
        tenant.roles.includes('PLATFORM_ADMIN'));
    if (!allowed) {
      throw new ForbiddenException('You cannot manage this college.');
    }
  }

  private toDetails(college: {
    id: string;
    name: string;
    slug: string;
    officialEmailDomain: string | null;
    website: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    description: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    status: CollegeDetails['status'];
  }): CollegeDetails {
    return {
      id: college.id,
      name: college.name,
      slug: college.slug,
      officialEmailDomain: college.officialEmailDomain,
      website: college.website,
      logoUrl: college.logoUrl,
      coverUrl: college.coverUrl,
      description: college.description,
      address: college.address,
      city: college.city,
      state: college.state,
      country: college.country,
      status: college.status,
    };
  }

  private async uniqueCollegeSlug(value: string): Promise<string> {
    const root =
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 72) || `college-${randomUUID().slice(0, 8)}`;

    for (let index = 0; index < 5; index += 1) {
      const slug = index === 0 ? root : `${root}-${index + 1}`;
      const existing = await this.prisma.college.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existing) return slug;
    }

    return `${root}-${randomUUID().slice(0, 8)}`;
  }
}
