import { Injectable } from '@nestjs/common';
import type { CollegeSummary } from '@unisphere/types';

import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class CollegesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CollegeSummary[]> {
    return this.prisma.college.findMany({
      where: { status: 'VERIFIED' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        logoUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
