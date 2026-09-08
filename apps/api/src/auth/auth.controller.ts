import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthSession, CampusUser } from '@unisphere/types';
import { Throttle } from '@nestjs/throttler';
import {
  loginSchema,
  refreshSessionSchema,
  registerSchema,
  type LoginInput,
  type RefreshSessionInput,
  type RegisterInput,
} from '@unisphere/validation';

import type { AuthenticatedRequest } from '../common/authenticated-request';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body(new ZodValidationPipe(registerSchema)) input: RegisterInput,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthSession> {
    return this.auth.register(input, userAgent);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthSession> {
    return this.auth.login(input, userAgent);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(
    @Body(new ZodValidationPipe(refreshSessionSchema))
    input: RefreshSessionInput,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthSession> {
    return this.auth.refresh(input, userAgent);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Body(new ZodValidationPipe(refreshSessionSchema))
    input: RefreshSessionInput,
  ): Promise<void> {
    await this.auth.logout(input);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: AuthenticatedRequest): Promise<CampusUser> {
    return this.auth.me(request.user.userId);
  }
}
