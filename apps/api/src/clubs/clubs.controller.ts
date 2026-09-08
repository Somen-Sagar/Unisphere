import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { CampusClub, CampusClubDetails } from '@unisphere/types';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
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
}
