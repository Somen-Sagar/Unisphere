import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CollegeDetails,
  CollegeSummary,
  Membership,
} from '@unisphere/types';
import type {
  CreateCollegeInput,
  UpdateCollegeInput,
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
      include: { college: true },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return memberships.map((membership) => ({
      id: membership.id,
      collegeId: membership.collegeId,
      role: membership.role,
      status: membership.status,
      studentId: membership.studentId,
      college: {
        id: membership.college.id,
        name: membership.college.name,
        slug: membership.college.slug,
        city: membership.college.city,
        state: membership.college.state,
        logoUrl: membership.college.logoUrl,
        status: membership.college.status,
      },
    }));
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
