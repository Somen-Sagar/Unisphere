-- Expand the existing club role enum without removing legacy values. Keeping the
-- values makes this migration safe for databases that already contain them.
ALTER TYPE "ClubMembershipRole" ADD VALUE IF NOT EXISTS 'CLUB_MENTOR';
ALTER TYPE "ClubMembershipRole" ADD VALUE IF NOT EXISTS 'CLUB_LEAD';
ALTER TYPE "ClubMembershipRole" ADD VALUE IF NOT EXISTS 'CLUB_SUB_LEAD';
ALTER TYPE "ClubMembershipRole" ADD VALUE IF NOT EXISTS 'ORGANIZER';
ALTER TYPE "ClubMembershipRole" ADD VALUE IF NOT EXISTS 'CORE_MEMBER';

ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'POSTPONED';

CREATE TYPE "ClubPermission" AS ENUM (
  'CLUB_VIEW_MEMBERS',
  'CLUB_MANAGE_MEMBERS',
  'CLUB_EDIT_PROFILE',
  'CLUB_MANAGE_ROLES',
  'CLUB_CREATE_EVENT',
  'CLUB_EDIT_EVENT',
  'CLUB_DELETE_EVENT',
  'CLUB_PUBLISH_EVENT',
  'CLUB_VIEW_REGISTRATIONS',
  'CLUB_MANAGE_REGISTRATIONS',
  'CLUB_MARK_ATTENDANCE',
  'CLUB_POST_ANNOUNCEMENT',
  'CLUB_MANAGE_RECRUITMENT',
  'CLUB_VIEW_ANALYTICS',
  'CLUB_MANAGE_MEDIA',
  'CLUB_MANAGE_PERMISSIONS'
);

CREATE TYPE "PermissionEffect" AS ENUM ('GRANT', 'REVOKE');
CREATE TYPE "EventOrganizerPermission" AS ENUM (
  'EDIT_EVENT',
  'VIEW_REGISTRATIONS',
  'MANAGE_REGISTRATIONS',
  'MARK_ATTENDANCE',
  'SEND_EVENT_NOTIFICATION'
);
CREATE TYPE "ClubApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "AttendanceMethod" AS ENUM ('QR', 'MANUAL');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'REVOKED');

ALTER TABLE "college_memberships"
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "academicYear" INTEGER,
  ADD COLUMN "semester" INTEGER;

ALTER TABLE "club_memberships" ADD COLUMN "joinedAt" TIMESTAMP(3);
UPDATE "club_memberships" SET "joinedAt" = "createdAt" WHERE "status" = 'ACTIVE' AND "joinedAt" IS NULL;

-- Normalize legacy governance assignments while retaining the old enum values
-- for backwards-compatible reads during rolling deploys.
UPDATE "club_memberships" SET "role" = 'CLUB_LEAD' WHERE "role" IN ('ADMIN', 'PRESIDENT');
UPDATE "club_memberships" SET "role" = 'CLUB_SUB_LEAD' WHERE "role" IN ('LEAD', 'SECRETARY');

CREATE TABLE "club_permission_overrides" (
  "id" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "permission" "ClubPermission" NOT NULL,
  "effect" "PermissionEffect" NOT NULL,
  "grantedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "club_permission_overrides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_organizers" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CO_ORGANIZER',
  "permissions" "EventOrganizerPermission"[] NOT NULL DEFAULT ARRAY[]::"EventOrganizerPermission"[],
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_organizers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "checkedInById" TEXT NOT NULL,
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" "AttendanceMethod" NOT NULL DEFAULT 'MANUAL',
  "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
  CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_applications" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "answers" JSONB,
  "status" "ClubApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "club_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_announcements" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "club_announcements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_audit_logs" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "college_memberships_departmentId_idx" ON "college_memberships"("departmentId");
CREATE UNIQUE INDEX "club_permission_overrides_membershipId_permission_key" ON "club_permission_overrides"("membershipId", "permission");
CREATE INDEX "club_permission_overrides_membershipId_effect_idx" ON "club_permission_overrides"("membershipId", "effect");
CREATE UNIQUE INDEX "event_organizers_eventId_userId_key" ON "event_organizers"("eventId", "userId");
CREATE INDEX "event_organizers_userId_assignedAt_idx" ON "event_organizers"("userId", "assignedAt");
CREATE UNIQUE INDEX "attendance_registrationId_key" ON "attendance"("registrationId");
CREATE UNIQUE INDEX "attendance_eventId_registrationId_key" ON "attendance"("eventId", "registrationId");
CREATE INDEX "attendance_collegeId_eventId_status_idx" ON "attendance"("collegeId", "eventId", "status");
CREATE UNIQUE INDEX "club_applications_clubId_userId_key" ON "club_applications"("clubId", "userId");
CREATE INDEX "club_applications_collegeId_clubId_status_idx" ON "club_applications"("collegeId", "clubId", "status");
CREATE INDEX "club_announcements_collegeId_clubId_publishedAt_idx" ON "club_announcements"("collegeId", "clubId", "publishedAt");
CREATE INDEX "club_audit_logs_collegeId_clubId_createdAt_idx" ON "club_audit_logs"("collegeId", "clubId", "createdAt");

ALTER TABLE "college_memberships" ADD CONSTRAINT "college_memberships_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "club_permission_overrides" ADD CONSTRAINT "club_permission_overrides_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "club_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_permission_overrides" ADD CONSTRAINT "club_permission_overrides_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "event_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_applications" ADD CONSTRAINT "club_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_announcements" ADD CONSTRAINT "club_announcements_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_announcements" ADD CONSTRAINT "club_announcements_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_announcements" ADD CONSTRAINT "club_announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_audit_logs" ADD CONSTRAINT "club_audit_logs_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_audit_logs" ADD CONSTRAINT "club_audit_logs_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_audit_logs" ADD CONSTRAINT "club_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve existing successful check-ins in the normalized attendance table.
INSERT INTO "attendance" ("id", "collegeId", "eventId", "registrationId", "checkedInById", "checkedInAt", "method", "status")
SELECT 'att_' || md5(registration."id"), registration."collegeId", registration."eventId", registration."id", registration."checkedInBy", registration."checkedInAt", 'MANUAL', 'PRESENT'
FROM "event_registrations" registration
JOIN "users" checker ON checker."id" = registration."checkedInBy"
WHERE registration."checkedInAt" IS NOT NULL AND registration."checkedInBy" IS NOT NULL
ON CONFLICT ("registrationId") DO NOTHING;
