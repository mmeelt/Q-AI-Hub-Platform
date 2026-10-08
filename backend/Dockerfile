# ---- Build: compile the Spring Boot jar ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
# Dependencies first: cached as long as pom.xml does not change
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src src
RUN mvn -q -B package -DskipTests

# ---- Run: small JRE image, non-root user ----
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 qaihub && mkdir -p /app/uploads && chown qaihub /app/uploads
COPY --from=build /src/target/*.jar app.jar
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER qaihub
# Uploaded logos, documents and pitch videos
VOLUME /app/uploads
EXPOSE 8081
ENTRYPOINT ["docker-entrypoint.sh"]
