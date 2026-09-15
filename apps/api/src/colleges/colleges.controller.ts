import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  CollegeDetails,
  CollegeSummary,
  Membership,
} from '@unisphere/types';
import {
  createCollegeSchema,
  type CreateCollegeInput,
  type UpdateCollegeInput,
  updateCollegeSchema,
} from '@unisphere/validation';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import type { AccessTokenUser } from '../common/authenticated-request';
import { RolesGuard } from '../common/roles.guard';
import { TenantRoles } from '../common/roles.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CollegesService } from './colleges.service';

@Controller('colleges')
export class CollegesController {
  constructor(private readonly colleges: CollegesService) {}

  @Get()
  findAll(): Promise<CollegeSummary[]> {
    return this.colleges.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string): Promise<CollegeDetails> {
    return this.colleges.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: AccessTokenUser,
    @Body(new ZodValidationPipe(createCollegeSchema)) input: CreateCollegeInput,
  ): Promise<CollegeDetails> {
    return this.colleges.create(user.userId, input);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @TenantRoles('COLLEGE_ADMIN', 'PLATFORM_ADMIN')
  @Patch(':collegeId')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('collegeId') collegeId: string,
    @Body(new ZodValidationPipe(updateCollegeSchema)) input: UpdateCollegeInput,
  ): Promise<CollegeDetails> {
    return this.colleges.update(tenant, collegeId, input);
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @TenantRoles('COLLEGE_ADMIN', 'PLATFORM_ADMIN')
  @Get(':collegeId/members')
  members(
    @CurrentTenant() tenant: TenantContext,
    @Param('collegeId') collegeId: string,
  ): Promise<Membership[]> {
    return this.colleges.members(tenant, collegeId);
  }
}
