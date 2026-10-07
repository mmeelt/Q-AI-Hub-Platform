-- =====================================================================
-- V3 - Remember that a user proved they own their email address
-- (used by the "Require email verification" setting: when it is off,
-- verified users log in with their password only).
-- =====================================================================
ALTER TABLE users ADD COLUMN email_verified BIT(1) NULL;
