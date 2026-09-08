import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthSession, CampusUser } from '@unisphere/types';
import type {
  LoginInput,
  RefreshSessionInput,
  RegisterInput,
} from '@unisphere/validation';
import { hash, verify } from 'argon2';
import { createHash, randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
};

const userInclude = {
  memberships: {
    include: {
      college: true,
    },
  },
} as const;

type UserWithMemberships = Awaited<
  ReturnType<AuthService['findUserWithMemberships']>
>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(
    input: RegisterInput,
    userAgent?: string,
  ): Promise<AuthSession> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account already exists for this email.');
    }

    if (input.college.mode === 'join') {
      const college = await this.prisma.college.findUnique({
        where: { id: input.college.collegeId },
        select: { id: true },
      });
      if (!college)
        throw new ConflictException('The selected college does not exist.');
    }

    const passwordHash = await hash(input.password);
    const role = input.role ?? 'STUDENT';
    const user = await this.prisma.$transaction(async (tx) => {
      const college =
        input.college.mode === 'create'
          ? await tx.college.create({
              data: {
                name: input.college.name,
                slug: await this.uniqueCollegeSlug(input.college.name),
                officialEmailDomain: input.college.emailDomain,
                website: input.college.website,
                city: input.college.city,
                state: input.college.state,
                status: 'PENDING',
              },
              select: { id: true },
            })
          : { id: input.college.collegeId };

      return tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          memberships: {
            create: {
              collegeId: college.id,
              role: input.college.mode === 'create' ? 'COLLEGE_ADMIN' : role,
              status: 'PENDING',
              studentId:
                input.college.mode === 'join'
                  ? input.college.studentId
                  : undefined,
            },
          },
        },
        include: userInclude,
      });
    });

    return this.issueSession(user, userAgent);
  }

  async login(input: LoginInput, userAgent?: string): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: userInclude,
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await verify(user.passwordHash, input.password))
    ) {
      throw new UnauthorizedException('The email or password is incorrect.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueSession(user, userAgent);
  }

  async refresh(
    input: RefreshSessionInput,
    userAgent?: string,
  ): Promise<AuthSession> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(input.refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'The refresh session is invalid or expired.',
      );
    }

    const tokenHash = this.hashToken(input.refreshToken);
    const storedSession = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: { include: userInclude } },
    });

    if (
      !storedSession ||
      storedSession.userId !== payload.sub ||
      storedSession.revokedAt ||
      storedSession.expiresAt <= new Date() ||
      storedSession.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'The refresh session is invalid or expired.',
      );
    }

    await this.prisma.refreshSession.update({
      where: { id: storedSession.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(storedSession.user, userAgent);
  }

  async logout(input: RefreshSessionInput): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        tokenHash: this.hashToken(input.refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<CampusUser> {
    const user = await this.findUserWithMemberships(userId);
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();
    return this.toCampusUser(user);
  }

  private async issueSession(
    user: NonNullable<UserWithMemberships>,
    userAgent?: string,
  ): Promise<AuthSession> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const refreshPayload = { ...payload, jti: randomUUID() };
    const refreshDays = Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 30);
    const expiresIn = Number(this.config.get('JWT_ACCESS_TTL_SECONDS') ?? 900);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshDays * 24 * 60 * 60,
      }),
    ]);

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        userAgent: userAgent?.slice(0, 500),
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: this.toCampusUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn,
      },
    };
  }

  private findUserWithMemberships(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    });
  }

  private toCampusUser(user: NonNullable<UserWithMemberships>): CampusUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      memberships: user.memberships.map((membership) => ({
        id: membership.id,
        collegeId: membership.collegeId,
        role: membership.role,
        status: membership.status,
        studentId: membership.studentId,
        college: {
          id: membership.college.id,
          name: membership.college.name,
          slug: membership.college.slug,
          city: membership.college.city,
          state: membership.college.state,
          logoUrl: membership.college.logoUrl,
        },
      })),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async uniqueCollegeSlug(name: string): Promise<string> {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 64);
    const fallback = `college-${randomUUID().slice(0, 8)}`;
    const root = base || fallback;

    for (let index = 0; index < 5; index += 1) {
      const slug = index === 0 ? root : `${root}-${index + 1}`;
      const existing = await this.prisma.college.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existing) return slug;
    }

    return `${root}-${randomUUID().slice(0, 8)}`;
  }
}
