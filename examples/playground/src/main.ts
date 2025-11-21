import { KarinFactory } from "@karinjs/core";
import { H3Adapter } from "@karinjs/platform-h3";

async function bootstrap() {
  const app = await KarinFactory.create(new H3Adapter(), {
    scan: "./src/**/*.controller.ts",
  });

  app.listen(3000);
}

bootstrap();
