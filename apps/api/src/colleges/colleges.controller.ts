import { Controller, Get } from '@nestjs/common';
import type { CollegeSummary } from '@unisphere/types';

import { CollegesService } from './colleges.service';

@Controller('colleges')
export class CollegesController {
  constructor(private readonly colleges: CollegesService) {}

  @Get()
  findAll(): Promise<CollegeSummary[]> {
    return this.colleges.findAll();
  }
}
