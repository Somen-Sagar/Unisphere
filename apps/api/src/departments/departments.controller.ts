import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { Department } from '@unisphere/types';
import {
  createDepartmentSchema,
  type CreateDepartmentInput,
} from '@unisphere/validation';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { RolesGuard } from '../common/roles.guard';
import { TenantRoles } from '../common/roles.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DepartmentsService } from './departments.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  findAll(@CurrentTenant() tenant: TenantContext): Promise<Department[]> {
    return this.departments.findAll(tenant);
  }

  @UseGuards(RolesGuard)
  @TenantRoles('FACULTY', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN')
  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createDepartmentSchema))
    input: CreateDepartmentInput,
  ): Promise<Department> {
    return this.departments.create(tenant, input);
  }
}
