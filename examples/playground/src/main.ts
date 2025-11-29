import "reflect-metadata";
import { KarinFactory, Logger } from "@karin-js/core";
import { HonoAdapter } from "@karin-js/platform-hono";
import { ConfigPlugin, z } from "@karin-js/config";
import { MongoosePlugin } from "@karin-js/mongoose";
import { OpenApiPlugin } from "../../../packages/openapi";
import { RedisPlugin } from "@karin-js/redis";
import { HttpErrorFilter } from "./filters/http.filter";
import { DogsController } from "./dogs/dogs.controller";
import { FoxesController } from "./foxes/foxes.controller";
import { Dogs } from "./dogs/entities/dogs.entity";
import { Foxes } from "./foxes/entities/foxes.entity";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const config = new ConfigPlugin({
    requiredKeys: ["MONGO_URI", "DB_NAME", "PORT"],
  });

  const mongoose = new MongoosePlugin({
    uri: () => config.get("MONGO_URI"),
    options: () => ({
      dbName: config.get("DB_NAME"),
      authSource: "admin",
    }),
    models: [Dogs, Foxes],
  });

  const openapi = new OpenApiPlugin({
    path: "/docs",
    title: "Karin-JS API",
    version: "1.0.0",
  });

  const redis = new RedisPlugin({
    url: () => config.get("REDIS_URL"),
    failureStrategy: "warn",
  });

  const app = await KarinFactory.create(new HonoAdapter(), {
    // scan: "./src/**/*.ts",
    plugins: [
      config,
      mongoose,
      openapi,
      redis
    ],
    globalFilters: [
      new HttpErrorFilter(),
    ],
    controllers: [DogsController, FoxesController],
  });

  const port = parseInt(config.get("PORT") || "3000", 10);

  app.listen(port, () => {
    logger.log(
      `🦊 Karin-JS Server running on http://localhost:${port}`
    );
  });
}

bootstrap();
