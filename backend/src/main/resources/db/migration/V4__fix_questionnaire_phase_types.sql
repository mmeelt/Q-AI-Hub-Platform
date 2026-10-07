-- =====================================================================
-- V4 - Data fix: older code marked the questionnaire phases (1 and 2) of some
-- events as PITCH. A PITCH phase refuses questions and answers, so those events
-- could neither edit their questionnaires nor receive submissions.
-- Pitch phases are always phase 3 (or explicitly named "pitch").
-- =====================================================================
UPDATE phases
SET phase_type = 'QUESTIONNAIRE'
WHERE phase_type = 'PITCH'
  AND phase_order IN (1, 2)
  AND LOWER(phase_name) NOT LIKE '%pitch%';
