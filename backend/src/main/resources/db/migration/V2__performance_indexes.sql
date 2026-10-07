-- =====================================================================
-- V2 - Indexes for the most frequent lookups (columns without a foreign key,
-- so InnoDB did not index them automatically).
-- =====================================================================

-- Applications of an event / of a user / of a startup
CREATE INDEX idx_applications_event ON applications (target_event_id);
CREATE INDEX idx_applications_applicant ON applications (applicant_user_id);
CREATE INDEX idx_applications_startup ON applications (linked_startup_id);

-- "My registrations" and the duplicate check on guest registration
CREATE INDEX idx_event_registrations_email ON event_registrations (participant_email);

-- Notifications of a user (bell + dashboard)
CREATE INDEX idx_notifications_user ON notifications (target_user_id);

-- Phase submissions of an application
CREATE INDEX idx_phase_submissions_application ON phase_submissions (source_application_id);

-- One judge's evaluation of a startup in a round (multi-judge scoring)
CREATE INDEX idx_pitch_results_round_app_judge ON pitch_round_results (pitch_round_id, application_id, evaluated_by);
