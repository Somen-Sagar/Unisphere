-- Normalize legacy college-level club/department roles into the current
-- college role model. Enum values remain for rolling-deploy compatibility,
-- but no active authority is derived from them after this migration.
DELETE FROM "college_memberships" legacy
USING "college_memberships" canonical
WHERE legacy."userId" = canonical."userId"
  AND legacy."collegeId" = canonical."collegeId"
  AND legacy."role" = 'CLUB_ADMIN'
  AND canonical."role" = 'STUDENT';

UPDATE "college_memberships"
SET "role" = 'STUDENT'
WHERE "role" = 'CLUB_ADMIN';

DELETE FROM "college_memberships" legacy
USING "college_memberships" canonical
WHERE legacy."userId" = canonical."userId"
  AND legacy."collegeId" = canonical."collegeId"
  AND legacy."role" = 'DEPARTMENT_ADMIN'
  AND canonical."role" = 'FACULTY';

UPDATE "college_memberships"
SET "role" = 'FACULTY'
WHERE "role" = 'DEPARTMENT_ADMIN';
