# Бэкенд

REST API операций и категорий на Java 21 и Spring Boot. PostgreSQL хранит данные, Liquibase управляет миграциями.

Для запуска всех сервисов используйте [Compose из корня репозитория](../README.md#запуск-в-docker).

Для разработки бэкенда отдельно можно поднять только PostgreSQL и запустить Spring Boot с локальным JDK 21. Выполните из каталога `backend`:

```powershell
docker compose up -d --wait postgres
.\gradlew.bat bootRun
```

В этом режиме PostgreSQL доступен на порту `5433`, API — на порту `8080`.
