import { Injectable } from '@nestjs/common';
import type { Department } from '@unisphere/types';
import type { CreateDepartmentInput } from '@unisphere/validation';

import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenant: TenantContext): Promise<Department[]> {
    const departments = await this.prisma.department.findMany({
      where: { collegeId: tenant.collegeId },
      orderBy: { name: 'asc' },
    });
    return departments.map((department) => this.toDepartment(department));
  }

  async create(
    tenant: TenantContext,
    input: CreateDepartmentInput,
  ): Promise<Department> {
    const department = await this.prisma.department.create({
      data: {
        collegeId: tenant.collegeId,
        name: input.name,
        code: input.code,
        description: input.description,
      },
    });
    return this.toDepartment(department);
  }

  private toDepartment(department: {
    id: string;
    collegeId: string;
    name: string;
    code: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Department {
    return {
      id: department.id,
      collegeId: department.collegeId,
      name: department.name,
      code: department.code,
      description: department.description,
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
    };
  }
}
