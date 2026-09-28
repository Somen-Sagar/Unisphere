import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  ClubAccess,
  ClubAnnouncement,
  ClubApplication,
  ClubDashboardSummary,
  ClubMember,
} from '@unisphere/types';
import {
  addClubMemberSchema,
  clubMemberQuerySchema,
  createClubAnnouncementSchema,
  createClubApplicationSchema,
  reviewClubApplicationSchema,
  setClubPermissionSchema,
  updateClubMemberSchema,
  type AddClubMemberInput,
  type ClubMemberQueryInput,
  type CreateClubAnnouncementInput,
  type CreateClubApplicationInput,
  type ReviewClubApplicationInput,
  type SetClubPermissionInput,
  type UpdateClubMemberInput,
} from '@unisphere/validation';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClubPermissionGuard } from '../club-authorization/club-permission.guard';
import { RequireClubPermission } from '../club-authorization/club-permission.decorator';
import { CurrentTenant } from '../common/current-tenant.decorator';
import { TenantGuard } from '../common/tenant.guard';
import type { TenantContext } from '../common/tenant-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ClubManagementService } from './club-management.service';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('clubs/:clubId')
export class ClubManagementController {
  constructor(private readonly management: ClubManagementService) {}

  @Get('access')
  access(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
  ): Promise<ClubAccess> {
    return this.management.access(tenant, clubId);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_VIEW_ANALYTICS')
  @Get('dashboard')
  dashboard(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
  ): Promise<ClubDashboardSummary> {
    return this.management.dashboard(tenant, clubId);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_VIEW_MEMBERS')
  @Get('members')
  members(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Query(new ZodValidationPipe(clubMemberQuerySchema))
    query: ClubMemberQueryInput,
  ): Promise<ClubMember[]> {
    return this.management.members(tenant, clubId, query);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_MANAGE_MEMBERS')
  @Post('members')
  addMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Body(new ZodValidationPipe(addClubMemberSchema)) input: AddClubMemberInput,
  ): Promise<ClubMember> {
    return this.management.addMember(tenant, clubId, input);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_MANAGE_MEMBERS')
  @Patch('members/:membershipId')
  updateMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Param('membershipId') membershipId: string,
    @Body(new ZodValidationPipe(updateClubMemberSchema))
    input: UpdateClubMemberInput,
  ): Promise<ClubMember> {
    return this.management.updateMember(tenant, clubId, membershipId, input);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_MANAGE_MEMBERS')
  @Delete('members/:membershipId')
  removeMember(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Param('membershipId') membershipId: string,
  ): Promise<void> {
    return this.management.removeMember(tenant, clubId, membershipId);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_MANAGE_PERMISSIONS')
  @Patch('members/:membershipId/permissions/:permission')
  setPermission(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Param('membershipId') membershipId: string,
    @Param('permission') permission: string,
    @Body(new ZodValidationPipe(setClubPermissionSchema))
    input: SetClubPermissionInput,
  ): Promise<ClubMember> {
    return this.management.setPermission(
      tenant,
      clubId,
      membershipId,
      permission,
      input,
    );
  }

  @Get('announcements')
  announcements(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
  ): Promise<ClubAnnouncement[]> {
    return this.management.announcements(tenant, clubId);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_POST_ANNOUNCEMENT')
  @Post('announcements')
  createAnnouncement(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Body(new ZodValidationPipe(createClubAnnouncementSchema))
    input: CreateClubAnnouncementInput,
  ): Promise<ClubAnnouncement> {
    return this.management.createAnnouncement(tenant, clubId, input);
  }

  @Post('applications')
  apply(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Body(new ZodValidationPipe(createClubApplicationSchema))
    input: CreateClubApplicationInput,
  ): Promise<ClubApplication> {
    return this.management.apply(tenant, clubId, input);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_MANAGE_RECRUITMENT')
  @Get('applications')
  applications(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
  ): Promise<ClubApplication[]> {
    return this.management.applications(tenant, clubId);
  }

  @UseGuards(ClubPermissionGuard)
  @RequireClubPermission('CLUB_MANAGE_RECRUITMENT')
  @Patch('applications/:applicationId')
  reviewApplication(
    @CurrentTenant() tenant: TenantContext,
    @Param('clubId') clubId: string,
    @Param('applicationId') applicationId: string,
    @Body(new ZodValidationPipe(reviewClubApplicationSchema))
    input: ReviewClubApplicationInput,
  ): Promise<ClubApplication> {
    return this.management.reviewApplication(
      tenant,
      clubId,
      applicationId,
      input,
    );
  }
}
