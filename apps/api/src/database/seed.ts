import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { Pool } from 'pg';

import { PrismaClient } from '../generated/prisma/client';

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The development seed cannot run in production.');
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const passwordHash = await hash(process.env.SEED_PASSWORD ?? 'UniSphere123!');

  try {
    const college = await prisma.college.upsert({
      where: { slug: 'unisphere-institute' },
      update: { status: 'VERIFIED' },
      create: {
        name: 'UniSphere Institute',
        slug: 'unisphere-institute',
        officialEmailDomain: 'unisphere.local',
        city: 'Bengaluru',
        state: 'Karnataka',
        status: 'VERIFIED',
        description: 'Local development campus for the connected product flow.',
      },
    });

    const organizer = await prisma.user.upsert({
      where: { email: 'organizer@unisphere.local' },
      update: { passwordHash },
      create: {
        email: 'organizer@unisphere.local',
        passwordHash,
        firstName: 'Campus',
        lastName: 'Organizer',
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId_role: {
          userId: organizer.id,
          collegeId: college.id,
          role: 'CLUB_ADMIN',
        },
      },
      update: { status: 'ACTIVE', joinedAt: new Date() },
      create: {
        userId: organizer.id,
        collegeId: college.id,
        role: 'CLUB_ADMIN',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    const student = await prisma.user.upsert({
      where: { email: 'student@unisphere.local' },
      update: { passwordHash },
      create: {
        email: 'student@unisphere.local',
        passwordHash,
        firstName: 'Demo',
        lastName: 'Student',
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId_role: {
          userId: student.id,
          collegeId: college.id,
          role: 'STUDENT',
        },
      },
      update: { status: 'ACTIVE', joinedAt: new Date() },
      create: {
        userId: student.id,
        collegeId: college.id,
        role: 'STUDENT',
        status: 'ACTIVE',
        studentId: 'CC-001',
        joinedAt: new Date(),
      },
    });

    const club = await prisma.club.upsert({
      where: {
        collegeId_slug: {
          collegeId: college.id,
          slug: 'technology-club',
        },
      },
      update: { isActive: true },
      create: {
        collegeId: college.id,
        name: 'Technology Club',
        slug: 'technology-club',
        description:
          'Build, learn, and share technology with the campus community.',
      },
    });

    const existingEvent = await prisma.event.findFirst({
      where: {
        collegeId: college.id,
        title: 'UniSphere Launch Hackathon',
      },
    });
    if (!existingEvent) {
      const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const endsAt = new Date(startsAt.getTime() + 8 * 60 * 60 * 1000);
      await prisma.event.create({
        data: {
          collegeId: college.id,
          clubId: club.id,
          organizerId: organizer.id,
          title: 'UniSphere Launch Hackathon',
          description:
            'A full-day campus hackathon for students to create useful tools for clubs, events, and student life.',
          venue: 'Innovation Hall',
          startsAt,
          endsAt,
          registrationOpensAt: new Date(),
          registrationClosesAt: new Date(startsAt.getTime() - 60 * 60 * 1000),
          capacity: 120,
          status: 'REGISTRATION_OPEN',
        },
      });
    }

    console.log('Development campus, users, club, and event are ready.');
    console.log('Student: student@unisphere.local / UniSphere123!');
    console.log('Organizer: organizer@unisphere.local / UniSphere123!');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void seed();
