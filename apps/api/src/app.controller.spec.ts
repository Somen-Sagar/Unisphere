import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  const appServiceMock = {
    getHealth: jest.fn().mockResolvedValue({
      service: 'unisphere-api',
      status: 'ok',
      database: 'connected',
      redis: 'connected',
      timestamp: '2026-07-23T00:00:00.000Z',
    }),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appServiceMock,
        },
      ],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('returns the API health status', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        service: 'unisphere-api',
        status: 'ok',
        database: 'connected',
        redis: 'connected',
        timestamp: '2026-07-23T00:00:00.000Z',
      });

      expect(appServiceMock.getHealth).toHaveBeenCalledTimes(1);
    });
  });
});
