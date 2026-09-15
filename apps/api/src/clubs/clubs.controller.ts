import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { CampusClub, CampusClubDetails } from '@unisphere/types';
import {
  createClubSchema,
  type CreateClubInput,
  type UpdateClubInput,
  updateClubSchema,
} from '@unisphere/validation';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { RolesGuard } from '../common/roles.guard';
import { TenantRoles } from '../common/roles.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ClubsService } from './clubs.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubs: ClubsService) {}

  @Get()
  findAll(@CurrentTenant() tenant: TenantContext): Promise<CampusClub[]> {
    return this.clubs.findAll(tenant);
  }

  @Get(':clubId')
  findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
  ): Promise<CampusClubDetails> {
    return this.clubs.findOne(tenant, clubId);
  }

  @UseGuards(RolesGuard)
  @TenantRoles('CLUB_ADMIN', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN')
  @Post()
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createClubSchema)) input: CreateClubInput,
  ): Promise<CampusClub> {
    return this.clubs.create(tenant, input);
  }

  @UseGuards(RolesGuard)
  @TenantRoles('CLUB_ADMIN', 'DEPARTMENT_ADMIN', 'COLLEGE_ADMIN')
  @Patch(':clubId')
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Body(new ZodValidationPipe(updateClubSchema)) input: UpdateClubInput,
  ): Promise<CampusClub> {
    return this.clubs.update(tenant, clubId, input);
  }
}
