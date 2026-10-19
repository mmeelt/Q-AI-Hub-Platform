#!/usr/bin/env bash
# Test copy of the Q-AI Hub backend: port 8082, throwaway in-memory H2 database, e-mails to the fake inbox.
# The database is forced on the command line: if H2 cannot start, the app fails instead of using MySQL.
E="$(cd "$(dirname "$0")" && pwd)"
cd "$E/../../backend" || exit 1
DB_URL='jdbc:h2:mem:e2e;MODE=MySQL;DB_CLOSE_DELAY=-1' DB_USERNAME=sa DB_PASSWORD= DDL_AUTO=create-drop SPRING_PROFILES_ACTIVE=dev \
./mvnw -B -q spring-boot:run -Dspring-boot.run.useTestClasspath=true "-Dspring-boot.run.arguments=--server.port=8082 --spring.datasource.url=jdbc:h2:mem:e2e;MODE=MySQL;DB_CLOSE_DELAY=-1 --spring.datasource.driver-class-name=org.h2.Driver --spring.datasource.username=sa --spring.datasource.password= --spring.jpa.hibernate.ddl-auto=create-drop --spring.jpa.database-platform=org.hibernate.dialect.H2Dialect --spring.flyway.enabled=false --spring.mail.host=127.0.0.1 --spring.mail.port=2525 --spring.mail.username= --spring.mail.password= --spring.mail.properties.mail.smtp.auth=false --spring.mail.properties.mail.smtp.starttls.enable=false --spring.mail.properties.mail.smtp.starttls.required=false --app.seed.admin-password=E2eAdmin!2026 --file.upload-dir=$E/uploads" > "$E/backend-test.log" 2>&1
