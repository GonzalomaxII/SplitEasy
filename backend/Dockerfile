# Etapa 1: Compilar el proyecto con Maven
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

# Etapa 2: Ejecutar el .jar optimizando la memoria para Render
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx350m", "-Xms128m", "-jar", "app.jar"]