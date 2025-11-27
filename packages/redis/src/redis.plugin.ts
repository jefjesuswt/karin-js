import {
  type KarinPlugin,
  type KarinApplication,
  Logger,
  container,
} from "@karin-js/core";
import { Redis } from "ioredis";
import { REDIS_CLIENT_TOKEN } from "./decorators";
import type { KarinRedisConfig } from "./redis.options";

export class RedisPlugin implements KarinPlugin {
  name = "RedisPlugin";
  private logger = new Logger("Redis");
  private client: Redis;
  private failureStrategy: "fail" | "warn" = "fail"; // Default seguro

  constructor(config: KarinRedisConfig) {
    // Normalización de configuración
    let redisOptions: any = { lazyConnect: true, showFriendlyErrorStack: true };

    if (typeof config === "string") {
      // Caso simple string
      this.client = new Redis(config, redisOptions);
    } else if (
      "url" in config ||
      "options" in config ||
      "failureStrategy" in config
    ) {
      // Caso objeto mixto Karin
      const conf = config as {
        url?: string;
        options?: any;
        failureStrategy?: any;
      };
      if (conf.failureStrategy) this.failureStrategy = conf.failureStrategy;

      const userOptions = { ...conf.options, ...redisOptions };
      this.client = conf.url
        ? new Redis(conf.url, userOptions)
        : new Redis(userOptions);
    } else {
      // Caso RedisOptions directo
      this.client = new Redis({ ...(config as any), ...redisOptions });
    }

    // Manejo de errores en background para evitar crashes si la estrategia es 'warn'
    this.client.on("error", (err) => {
      // Silenciamos errores background si ya sabemos que falló o si estamos en modo resiliente
    });
  }

  install(app: KarinApplication) {
    container.registerInstance(REDIS_CLIENT_TOKEN, this.client);
  }

  async onPluginInit() {
    this.logger.log("Initializing connection...");

    try {
      // Intentamos conectar
      await this.client.connect();
      this.logger.log("✅ Connection established");
    } catch (error: any) {
      const msg = `Connection failed: ${error.message}`;

      if (this.failureStrategy === "fail") {
        this.logger.error(`❌ ${msg}`);
        this.logger.error(
          "🛑 Stopping app startup because Redis is required (failureStrategy='fail')."
        );
        // Re-lanzamos el error para que KarinApplication detenga el proceso
        throw error;
      } else {
        // Estrategia WARN (Fail Open)
        this.logger.warn(`⚠️ ${msg}`);
        this.logger.warn(
          "⚠️ App continuing without Redis (failureStrategy='warn'). Injecting disconnected client."
        );
        // No lanzamos error, la app sigue.
      }
    }
  }

  async onPluginDestroy() {
    if (this.client.status === "ready") {
      await this.client.quit();
    } else {
      this.client.disconnect();
    }
  }
}
