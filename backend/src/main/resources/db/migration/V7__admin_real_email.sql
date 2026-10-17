-- =====================================================================
-- V7 - Give the seeded admin a real inbox
-- admin@platform.com cannot receive mail, so its login codes (OTP) never
-- arrived. Skipped if the new address is already taken by an account.
-- =====================================================================
UPDATE admins
SET admin_email = 'qaihubb@gmail.com'
WHERE admin_email = 'admin@platform.com'
  AND NOT EXISTS (SELECT 1 FROM (SELECT admin_email FROM admins) a WHERE a.admin_email = 'qaihubb@gmail.com')
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email_address = 'qaihubb@gmail.com');
