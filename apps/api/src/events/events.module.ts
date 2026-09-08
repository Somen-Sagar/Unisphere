import { Module } from '@nestjs/common';

import { RegistrationsController } from '../registrations/registrations.controller';
import { RegistrationsService } from '../registrations/registrations.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  controllers: [EventsController, RegistrationsController],
  providers: [EventsService, RegistrationsService],
})
export class EventsModule {}
