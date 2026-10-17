#!/bin/sh
set -e
# No JWT_SECRET given (e.g. a quick local "docker compose up"): use a random one for this run.
# Sessions then end when the container restarts. Always set JWT_SECRET on a real server.
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  export JWT_SECRET
  echo "[entrypoint] JWT_SECRET not set: generated a temporary one (sessions reset on restart)."
fi
# Login codes are emailed when an SMTP account is configured. Without one (a quick local
# "docker compose up" with no .env) fall back to the fixed test code, so logging in still works.
if [ -z "$OTP_FIXED_ENABLED" ]; then
  if [ -n "$MAIL_USERNAME" ] && [ -n "$MAIL_PASSWORD" ]; then
    OTP_FIXED_ENABLED=false
  else
    OTP_FIXED_ENABLED=true
    OTP_FIXED_CODE=${OTP_FIXED_CODE:-123456}
    export OTP_FIXED_CODE
    echo "[entrypoint] MAIL_USERNAME / MAIL_PASSWORD not set: no emails, every login code is $OTP_FIXED_CODE."
  fi
  export OTP_FIXED_ENABLED
fi
exec java ${JAVA_OPTS:-} -jar /app/app.jar "$@"
