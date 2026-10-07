-- ============================================================================
-- One-shot cleanup after fixing the application / phase workflow.
--
-- Before the fix, every application was auto-accepted on submit (and on each
-- startup), a fake Phase 1 submission was created as ACCEPTED from the
-- application answers, and a Phase 2 DRAFT slot was created.
--
-- This script puts existing data back into the correct workflow:
--   * accepted applications  -> PENDING (the admin must accept them again)
--   * fabricated Phase 1 submissions -> deleted
--   * Phase 2 DRAFT slots without an accepted Phase 1 -> deleted
--
-- Run it manually, ONCE, against the dev database (MySQL), after a backup:
--   mysqldump -u root -p qaihub > qaihub_backup.sql
--   mysql -u root -p qaihub < db/reset_auto_accepted_phase_data.sql
-- ============================================================================

START TRANSACTION;

-- 1. Phase 1 submissions fabricated from the application answers
DELETE ps FROM phase_submissions ps
JOIN phases p ON p.phase_id = ps.phase_id
JOIN applications a ON a.application_id = ps.source_application_id
WHERE p.phase_order = 1
  AND ps.answers_json = a.initial_application_answers;

-- 2. Phase 2 DRAFT slots whose Phase 1 is not accepted
DELETE ps2 FROM phase_submissions ps2
JOIN phases p2 ON p2.phase_id = ps2.phase_id
WHERE p2.phase_order = 2
  AND ps2.status = 'DRAFT'
  AND NOT EXISTS (
      SELECT 1 FROM (
          SELECT ps1.source_application_id
          FROM phase_submissions ps1
          JOIN phases p1 ON p1.phase_id = ps1.phase_id
          WHERE p1.phase_order = 1 AND ps1.decision_status = 'ACCEPTED'
      ) accepted_p1
      WHERE accepted_p1.source_application_id = ps2.source_application_id
  );

-- 3. Applications that were auto-accepted go back to PENDING,
--    unless they already have a real, reviewed phase submission.
UPDATE applications a
SET a.application_status = 'PENDING'
WHERE a.application_status = 'ACCEPTED'
  AND NOT EXISTS (
      SELECT 1 FROM phase_submissions ps
      WHERE ps.source_application_id = a.application_id
        AND ps.status <> 'DRAFT'
  );

COMMIT;
