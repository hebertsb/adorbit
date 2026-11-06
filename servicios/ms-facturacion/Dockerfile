# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-21 AS construccion
WORKDIR /app
COPY pom.xml checkstyle.xml ./
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests -Dspotless.check.skip=true -Dcheckstyle.skip=true

FROM eclipse-temurin:21.0.5_11-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home facturacion
WORKDIR /app
COPY --from=construccion /app/target/ms-facturacion.jar app.jar
USER facturacion
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -fsS http://localhost:8082/salud || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
