import "reflect-metadata";
import { KarinFactory, Logger } from "@karin-js/core";
import { HonoAdapter } from "@karin-js/platform-hono";
import { ConfigPlugin } from "@karin-js/config";
import { MongoosePlugin } from "@karin-js/mongoose";
import { OpenApiPlugin } from "../../../packages/openapi";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await KarinFactory.create(new HonoAdapter(), {
    scan: "./src/**/*.ts",
  });

  const config = new ConfigPlugin({
    load: () => ({
      port: parseInt(process.env.PORT || "3000", 10),
      mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/test",
      dbName: process.env.DB_NAME || "test_db",
    }),
  });

  app.use(config);

  app.use(
    new MongoosePlugin({
      uri: config.get("mongoUri"),
      options: {
        dbName: config.get("dbName"),
        authSource: "admin",
      },
    })
  );

  app.use(new OpenApiPlugin({ path: "/docs" }));

  app.listen(config.get("port"), () => {
    logger.log(
      `🦊 Karin-JS Server running on http://localhost:${config.get("port")}`
    );
  });
}

bootstrap();
