-- CreateEnum
CREATE TYPE "ClubRecruitmentStatus" AS ENUM ('OPEN', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClubVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ClubMembershipRole" AS ENUM ('MEMBER', 'LEAD', 'SECRETARY', 'PRESIDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ClubMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'COLLEGE', 'CLUB', 'EVENT', 'REGISTRATION');

-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_memberships" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClubMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ClubMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "clubs"
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN "coverUrl" TEXT,
  ADD COLUMN "recruitmentStatus" "ClubRecruitmentStatus" NOT NULL DEFAULT 'CLOSED',
  ADD COLUMN "verificationStatus" "ClubVerificationStatus" NOT NULL DEFAULT 'VERIFIED';

-- AlterTable
ALTER TABLE "events"
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "eventType" TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN "onlineMeetingUrl" TEXT,
  ADD COLUMN "posterUrl" TEXT,
  ADD COLUMN "feeAmount" DECIMAL(10,2),
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

UPDATE "events"
SET "slug" = lower(regexp_replace("title", '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring("id", 1, 8)
WHERE "slug" IS NULL;

ALTER TABLE "events" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "event_registrations"
  ADD COLUMN "collegeId" TEXT,
  ADD COLUMN "registrationCode" TEXT,
  ADD COLUMN "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

UPDATE "event_registrations" AS registration
SET "collegeId" = event."collegeId",
    "registrationCode" = 'UNI-' || upper(substring(registration."id", 1, 10))
FROM "events" AS event
WHERE registration."eventId" = event."id";

ALTER TABLE "event_registrations" ALTER COLUMN "collegeId" SET NOT NULL;
ALTER TABLE "event_registrations" ALTER COLUMN "registrationCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "departments_collegeId_code_key" ON "departments"("collegeId", "code");

-- CreateIndex
CREATE INDEX "departments_collegeId_name_idx" ON "departments"("collegeId", "name");

-- CreateIndex
CREATE INDEX "clubs_collegeId_category_idx" ON "clubs"("collegeId", "category");

-- CreateIndex
CREATE INDEX "clubs_departmentId_idx" ON "clubs"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "club_memberships_clubId_userId_key" ON "club_memberships"("clubId", "userId");

-- CreateIndex
CREATE INDEX "club_memberships_userId_status_idx" ON "club_memberships"("userId", "status");

-- CreateIndex
CREATE INDEX "club_memberships_clubId_status_idx" ON "club_memberships"("clubId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "events_collegeId_slug_key" ON "events"("collegeId", "slug");

-- CreateIndex
CREATE INDEX "events_departmentId_startsAt_idx" ON "events"("departmentId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_registrationCode_key" ON "event_registrations"("registrationCode");

-- CreateIndex
CREATE INDEX "event_registrations_collegeId_status_idx" ON "event_registrations"("collegeId", "status");

-- CreateIndex
CREATE INDEX "notifications_collegeId_userId_readAt_idx" ON "notifications"("collegeId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
