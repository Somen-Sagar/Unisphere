import { Test, type TestingModule } from '@nestjs/testing';

import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import type { TenantContext } from '../common/tenant-context';
import { PrismaService } from '../database/prisma/prisma.service';

describe('ClubsController', () => {
  let controller: ClubsController;
  const clubsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
  const tenant: TenantContext = {
    userId: 'user-1',
    collegeId: 'college-1',
    roles: ['STUDENT'],
    membershipIds: ['membership-1'],
    college: {
      id: 'college-1',
      name: 'College One',
      slug: 'college-one',
      city: null,
      state: null,
      logoUrl: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubsController],
      providers: [
        { provide: ClubsService, useValue: clubsService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get(ClubsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('scopes the directory to the current tenant', async () => {
    clubsService.findAll.mockResolvedValue([]);
    await expect(controller.findAll(tenant)).resolves.toEqual([]);
    expect(clubsService.findAll).toHaveBeenCalledWith(tenant);
  });

  it('loads one tenant-scoped club profile', async () => {
    clubsService.findOne.mockResolvedValue({ id: 'club-1' });
    await expect(controller.findOne(tenant, 'club-1')).resolves.toEqual({
      id: 'club-1',
    });
    expect(clubsService.findOne).toHaveBeenCalledWith(tenant, 'club-1');
  });
});
