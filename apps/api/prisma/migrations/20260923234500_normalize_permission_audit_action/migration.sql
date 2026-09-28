-- Correct audit entries written before revoke actions used an explicit label.
UPDATE "club_audit_logs"
SET "action" = 'PERMISSION_REVOKED'
WHERE "action" = 'PERMISSION_REVOKEED';
