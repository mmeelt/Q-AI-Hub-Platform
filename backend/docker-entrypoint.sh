#!/bin/sh
set -e
# No JWT_SECRET given (e.g. a quick local "docker compose up"): use a random one for this run.
# Sessions then end when the container restarts. Always set JWT_SECRET on a real server.
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  export JWT_SECRET
  echo "[entrypoint] JWT_SECRET not set: generated a temporary one (sessions reset on restart)."
fi
# Login codes are always random and sent by email: an SMTP account (MAIL_USERNAME / MAIL_PASSWORD)
# is required to log in.
if [ -z "$MAIL_USERNAME" ] || [ -z "$MAIL_PASSWORD" ]; then
  echo "[entrypoint] WARNING: MAIL_USERNAME / MAIL_PASSWORD not set: login codes cannot be emailed, so nobody can log in."
fi
exec java ${JAVA_OPTS:-} -jar /app/app.jar "$@"
