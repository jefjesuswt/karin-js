import "reflect-metadata";
import { KarinFactory, Logger } from "@karin-js/core";
import { HonoAdapter } from "../../../packages/platform-hono";
import { HttpErrorFilter } from "./filters/http.filter";
import { MongoosePlugin } from "../../../packages/mongoose";
import { RedisPlugin } from "../../../packages/redis";
import { ConfigPlugin, z } from "../../../packages/config";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await KarinFactory.create(new HonoAdapter(), {
    scan: "./src/**/*.controller.ts",
  });

  // app.useGlobalFilters(new HttpErrorFilter());

  // app.use(
  //   new MongoosePlugin({
  //     uri:
  //       process.env.MONGO_URI ||
  //       "mongodb+srv://jefjesuswt:dai1jeff@dicasa.ef1zp8v.mongodb.net/?appName=Dicasa",
  //     scanModels: "./src/**/schemas/*.schema.ts",
  //   })
  // );

  // app.use(
  //   new RedisPlugin({
  //     url: process.env.REDIS_URL || "redis://localhost:6379",

  //     options: {
  //       family: 4,
  //     },

  //     failureStrategy: process.env.NODE_ENV === "production" ? "fail" : "warn",
  //   })
  // );
  //
  app.use(
    new ConfigPlugin({
      schema: z.object({
        PORT: z.coerce.number().default(3000), // Coerce convierte string "3000" a number 3000
        DB_HOST: z.string(),
        API_KEY: z.string().min(5),
        NODE_ENV: z
          .enum(["development", "production", "test"])
          .default("development"),
      }),
    })
  );

  const port = 3000;
  app.listen(port, () => {
    logger.log(`Server started successfully on http://localhost:${port}`);
  });
}

bootstrap();
