import "reflect-metadata";
import { KarinFactory, Logger } from "@karin-js/core";
import { HonoAdapter } from "../../../packages/platform-hono";
import { HttpErrorFilter } from "./filters/http.filter";
import { MongoosePlugin } from "../../../packages/mongoose";
import { RedisPlugin } from "../../../packages/redis";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  // 1. Crear la aplicación con Hono
  const app = await KarinFactory.create(new HonoAdapter(), {
    scan: "./src/**/*.controller.ts",
  });

  // 2. Registrar Filtros Globales (Manejo de errores bonito)
  app.useGlobalFilters(new HttpErrorFilter());

  // 3. Registrar Plugin de Base de Datos (Mongoose)
  app.use(
    new MongoosePlugin({
      // Usa tu URI real aquí o una variable de entorno
      uri:
        process.env.MONGO_URI ||
        "mongodb+srv://jefjesuswt:dai1jeff@dicasa.ef1zp8v.mongodb.net/?appName=Dicasa",
      // Escanea automáticamente cualquier archivo .schema.ts dentro de src
      scanModels: "./src/**/schemas/*.schema.ts",
    })
  );

  // 4. Registrar Plugin de Caché (Redis)
  app.use(
    new RedisPlugin({
      // Soporta URL completa (ej. Upstash) o configuración local
      url: process.env.REDIS_URL || "redis://localhost:6379",

      // Opciones adicionales de ioredis
      options: {
        family: 4, // Forzar IPv4 si tienes problemas con localhost
      },

      // Estrategia: 'warn' para desarrollo (no explota si no tienes Redis), 'fail' para producción
      failureStrategy: process.env.NODE_ENV === "production" ? "fail" : "warn",
    })
  );

  // 5. Arrancar el servidor
  const port = 3000;
  app.listen(port, () => {
    logger.log(`Server started successfully on http://localhost:${port}`);
  });
}

bootstrap();
