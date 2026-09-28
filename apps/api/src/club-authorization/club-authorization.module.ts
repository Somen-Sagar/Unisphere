import { Global, Module } from '@nestjs/common';

import { ClubPermissionGuard } from './club-permission.guard';
import { ClubPermissionService } from './club-permission.service';

@Global()
@Module({
  providers: [ClubPermissionService, ClubPermissionGuard],
  exports: [ClubPermissionService, ClubPermissionGuard],
})
export class ClubAuthorizationModule {}
