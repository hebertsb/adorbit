FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:17-jre-alpine AS produccion
WORKDIR /app
RUN addgroup -S adorbit && adduser -S adorbit -G adorbit
USER adorbit:adorbit
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENV PORT=8081
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/salud || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]

