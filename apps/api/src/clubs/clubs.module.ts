import { Module } from '@nestjs/common';

import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubManagementController } from './club-management.controller';
import { ClubManagementService } from './club-management.service';

@Module({
  controllers: [ClubsController, ClubManagementController],
  providers: [ClubsService, ClubManagementService],
})
export class ClubsModule {}
