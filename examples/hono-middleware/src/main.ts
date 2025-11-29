import "reflect-metadata";
import { KarinFactory, Logger } from "@karin-js/core";
import { HonoAdapter } from "@karin-js/platform-hono";
import { logger } from "hono/logger";
import { HonoFeaturesController } from "./hono-features.controller";

async function bootstrap() {
    const appLogger = new Logger("Bootstrap");

    // 1. Create Adapter
    const adapter = new HonoAdapter();

    // 2. Access Native Instance for Global Middleware
    const hono = adapter.getInstance();
    hono.use("*", logger()); // Native Hono Logger

    // 3. Create App
    const app = await KarinFactory.create(adapter, {
        controllers: [HonoFeaturesController],
    });

    const port = 3000;

    app.listen(port, () => {
        appLogger.log(`
🚀 Server running on http://localhost:${port}

Try these endpoints:
➡️  http://localhost:${port}/hono/secure      (Secure Headers)
➡️  http://localhost:${port}/hono/cached      (Cached Response)
➡️  http://localhost:${port}/hono/state       (Context State Sharing)
➡️  http://localhost:${port}/hono/timing      (Custom Middleware)
    `);
    });
}

bootstrap();
