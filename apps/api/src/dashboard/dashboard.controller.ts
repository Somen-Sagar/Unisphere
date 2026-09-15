import { Controller, Get, UseGuards } from '@nestjs/common';
import type { DashboardSummary } from '@unisphere/types';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentTenant() tenant: TenantContext): Promise<DashboardSummary> {
    return this.dashboard.summary(tenant);
  }
}
