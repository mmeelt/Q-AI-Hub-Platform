-- =====================================================================
-- V9 - Professional details filled in by invited experts at sign-up
-- (participants keep using university / student fields).
-- =====================================================================
ALTER TABLE users ADD COLUMN organization VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN job_title VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN expertise_area VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN linkedin_url VARCHAR(512) NULL;
