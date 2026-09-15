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
      where: { slug: 'unisphere-demo-university' },
      update: {
        status: 'VERIFIED',
        description:
          'A realistic local development campus for the connected UniSphere product flow.',
      },
      create: {
        name: 'UniSphere Demo University',
        slug: 'unisphere-demo-university',
        officialEmailDomain: 'demo.unisphere.local',
        city: 'Bengaluru',
        state: 'Karnataka',
        status: 'VERIFIED',
        description:
          'A realistic local development campus for the connected UniSphere product flow.',
      },
    });

    const student = await prisma.user.upsert({
      where: { email: 'student@example.test' },
      update: { passwordHash },
      create: {
        email: 'student@example.test',
        passwordHash,
        firstName: 'Vedant',
        lastName: 'Sharma',
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
        studentId: 'USDU-24-CS-001',
        joinedAt: new Date(),
      },
    });

    const clubAdmin = await prisma.user.upsert({
      where: { email: 'clubadmin@example.test' },
      update: { passwordHash },
      create: {
        email: 'clubadmin@example.test',
        passwordHash,
        firstName: 'Ananya',
        lastName: 'Rao',
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId_role: {
          userId: clubAdmin.id,
          collegeId: college.id,
          role: 'CLUB_ADMIN',
        },
      },
      update: { status: 'ACTIVE', joinedAt: new Date() },
      create: {
        userId: clubAdmin.id,
        collegeId: college.id,
        role: 'CLUB_ADMIN',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    const collegeAdmin = await prisma.user.upsert({
      where: { email: 'admin@example.test' },
      update: { passwordHash },
      create: {
        email: 'admin@example.test',
        passwordHash,
        firstName: 'Meera',
        lastName: 'Iyer',
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.collegeMembership.upsert({
      where: {
        userId_collegeId_role: {
          userId: collegeAdmin.id,
          collegeId: college.id,
          role: 'COLLEGE_ADMIN',
        },
      },
      create: {
        userId: collegeAdmin.id,
        collegeId: college.id,
        role: 'COLLEGE_ADMIN',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
      update: { status: 'ACTIVE', joinedAt: new Date() },
    });

    const computerScience = await prisma.department.upsert({
      where: {
        collegeId_code: { collegeId: college.id, code: 'CSE' },
      },
      create: {
        collegeId: college.id,
        name: 'Computer Science',
        code: 'CSE',
        description: 'Software, AI, systems, and product engineering.',
      },
      update: {
        name: 'Computer Science',
        description: 'Software, AI, systems, and product engineering.',
      },
    });
    const electronics = await prisma.department.upsert({
      where: {
        collegeId_code: { collegeId: college.id, code: 'ECE' },
      },
      create: {
        collegeId: college.id,
        name: 'Electronics and Communication',
        code: 'ECE',
        description: 'Robotics, embedded systems, and campus hardware labs.',
      },
      update: {
        name: 'Electronics and Communication',
        description: 'Robotics, embedded systems, and campus hardware labs.',
      },
    });

    const codingClub = await prisma.club.upsert({
      where: {
        collegeId_slug: {
          collegeId: college.id,
          slug: 'coding-club',
        },
      },
      update: {
        departmentId: computerScience.id,
        isActive: true,
        verificationStatus: 'VERIFIED',
        recruitmentStatus: 'OPEN',
      },
      create: {
        collegeId: college.id,
        departmentId: computerScience.id,
        name: 'Coding Club',
        slug: 'coding-club',
        category: 'Technology',
        recruitmentStatus: 'OPEN',
        verificationStatus: 'VERIFIED',
        description:
          'Competitive programming, product builds, and peer-led engineering workshops.',
      },
    });
    await prisma.clubMembership.upsert({
      where: { clubId_userId: { clubId: codingClub.id, userId: clubAdmin.id } },
      create: {
        clubId: codingClub.id,
        userId: clubAdmin.id,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      update: { role: 'ADMIN', status: 'ACTIVE' },
    });

    const roboticsClub = await prisma.club.upsert({
      where: {
        collegeId_slug: {
          collegeId: college.id,
          slug: 'robotics-club',
        },
      },
      update: {
        departmentId: electronics.id,
        isActive: true,
        verificationStatus: 'VERIFIED',
        recruitmentStatus: 'OPEN',
      },
      create: {
        collegeId: college.id,
        departmentId: electronics.id,
        name: 'Robotics Club',
        slug: 'robotics-club',
        category: 'Robotics',
        recruitmentStatus: 'OPEN',
        verificationStatus: 'VERIFIED',
        description:
          'Campus robotics projects, embedded systems builds, and competition teams.',
      },
    });

    await prisma.club.upsert({
      where: {
        collegeId_slug: {
          collegeId: college.id,
          slug: 'cultural-society',
        },
      },
      update: {
        isActive: true,
        verificationStatus: 'VERIFIED',
        recruitmentStatus: 'PAUSED',
      },
      create: {
        collegeId: college.id,
        name: 'Cultural Society',
        slug: 'cultural-society',
        category: 'Culture',
        recruitmentStatus: 'PAUSED',
        verificationStatus: 'VERIFIED',
        description:
          'Music, theatre, literary programming, and flagship campus festivals.',
      },
    });

    const eventStarts = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const eventEnds = new Date(eventStarts.getTime() + 8 * 60 * 60 * 1000);
    const hackathon = await prisma.event.upsert({
      where: {
        collegeId_slug: {
          collegeId: college.id,
          slug: 'demo-campus-hackathon',
        },
      },
      create: {
        collegeId: college.id,
        clubId: codingClub.id,
        departmentId: computerScience.id,
        organizerId: clubAdmin.id,
        slug: 'demo-campus-hackathon',
        title: 'Campus Product Hackathon',
        description:
          'A full-day build sprint for students creating tools for clubs, events, and campus life.',
        eventType: 'HACKATHON',
        venue: 'Innovation Hall',
        startsAt: eventStarts,
        endsAt: eventEnds,
        registrationOpensAt: new Date(Date.now() - 60 * 60 * 1000),
        registrationClosesAt: new Date(eventStarts.getTime() - 60 * 60 * 1000),
        capacity: 120,
        status: 'REGISTRATION_OPEN',
      },
      update: {
        startsAt: eventStarts,
        endsAt: eventEnds,
        registrationOpensAt: new Date(Date.now() - 60 * 60 * 1000),
        registrationClosesAt: new Date(eventStarts.getTime() - 60 * 60 * 1000),
        status: 'REGISTRATION_OPEN',
      },
    });

    const workshopStarts = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await prisma.event.upsert({
      where: {
        collegeId_slug: {
          collegeId: college.id,
          slug: 'ai-workshop',
        },
      },
      create: {
        collegeId: college.id,
        clubId: codingClub.id,
        departmentId: computerScience.id,
        organizerId: clubAdmin.id,
        slug: 'ai-workshop',
        title: 'Applied AI Workshop',
        description:
          'A hands-on session on prompt design, evaluation, and building responsible AI workflows.',
        eventType: 'WORKSHOP',
        venue: 'Lab 204',
        startsAt: workshopStarts,
        endsAt: new Date(workshopStarts.getTime() + 2 * 60 * 60 * 1000),
        registrationOpensAt: new Date(Date.now() - 60 * 60 * 1000),
        registrationClosesAt: new Date(
          workshopStarts.getTime() - 2 * 60 * 60 * 1000,
        ),
        capacity: 60,
        status: 'REGISTRATION_OPEN',
      },
      update: {
        startsAt: workshopStarts,
        endsAt: new Date(workshopStarts.getTime() + 2 * 60 * 60 * 1000),
        registrationClosesAt: new Date(
          workshopStarts.getTime() - 2 * 60 * 60 * 1000,
        ),
        status: 'REGISTRATION_OPEN',
      },
    });

    const roboticsStarts = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
    await prisma.event.upsert({
      where: {
        collegeId_slug: {
          collegeId: college.id,
          slug: 'robotics-meetup',
        },
      },
      create: {
        collegeId: college.id,
        clubId: roboticsClub.id,
        departmentId: electronics.id,
        organizerId: clubAdmin.id,
        slug: 'robotics-meetup',
        title: 'Robotics Systems Meetup',
        description:
          'An evening showcase of autonomous bots, embedded projects, and competition planning.',
        eventType: 'MEETUP',
        venue: 'Robotics Lab',
        startsAt: roboticsStarts,
        endsAt: new Date(roboticsStarts.getTime() + 3 * 60 * 60 * 1000),
        registrationOpensAt: new Date(Date.now() - 60 * 60 * 1000),
        registrationClosesAt: new Date(
          roboticsStarts.getTime() - 2 * 60 * 60 * 1000,
        ),
        capacity: 80,
        status: 'PUBLISHED',
      },
      update: {
        startsAt: roboticsStarts,
        endsAt: new Date(roboticsStarts.getTime() + 3 * 60 * 60 * 1000),
        registrationClosesAt: new Date(
          roboticsStarts.getTime() - 2 * 60 * 60 * 1000,
        ),
        status: 'PUBLISHED',
      },
    });

    await prisma.eventRegistration.upsert({
      where: {
        eventId_userId: { eventId: hackathon.id, userId: student.id },
      },
      create: {
        collegeId: college.id,
        eventId: hackathon.id,
        userId: student.id,
        status: 'REGISTERED',
        registrationCode: 'UNI-DEMO-0001',
      },
      update: {
        collegeId: college.id,
        status: 'REGISTERED',
        cancelledAt: null,
        checkedInAt: null,
      },
    });

    const existingNotification = await prisma.notification.findFirst({
      where: {
        collegeId: college.id,
        userId: student.id,
        title: 'Hackathon registration confirmed',
      },
      select: { id: true },
    });
    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          collegeId: college.id,
          userId: student.id,
          type: 'REGISTRATION',
          title: 'Hackathon registration confirmed',
          message:
            'Your pass for Campus Product Hackathon is ready in UniSphere.',
        },
      });
    }

    console.log(
      'Development campus, users, departments, clubs, and events are ready.',
    );
    console.log('Student: student@example.test / UniSphere123!');
    console.log('Club admin: clubadmin@example.test / UniSphere123!');
    console.log('College admin: admin@example.test / UniSphere123!');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void seed();
