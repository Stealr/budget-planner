FROM gradle:8.14.3-jdk21 AS build
WORKDIR /app

COPY gradlew build.gradle settings.gradle ./
COPY gradle/ ./gradle/
COPY src/ ./src/
RUN sh ./gradlew --no-daemon bootJar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S -G app app
COPY --from=build /app/build/libs/*.jar /app/app.jar

USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
