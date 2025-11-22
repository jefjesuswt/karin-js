import { KarinFactory } from "@karin-js/core";
import { HonoAdapter } from "../../../packages/platform-hono";
import { H3Adapter } from "../../../packages/platform-h3";

async function bootstrap() {
  const app = await KarinFactory.create(new HonoAdapter(), {
    scan: "./src/**/*.controller.ts",
  });

  app.listen(3000);
}

bootstrap();
