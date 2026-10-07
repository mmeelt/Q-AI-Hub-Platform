-- =====================================================================
-- V5 - Separate login codes from password-reset codes
-- (a reset code must never be usable to log in, and vice versa).
-- NULL = codes created before this column existed = login codes.
-- =====================================================================
ALTER TABLE otp_tokens ADD COLUMN purpose VARCHAR(20) NULL;
