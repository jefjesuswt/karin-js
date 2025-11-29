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
  private client!: Redis;
  private failureStrategy: "fail" | "warn" = "fail"; // Default seguro
  private config: KarinRedisConfig;

  constructor(config: KarinRedisConfig) {
    this.config = config;

    if (typeof config === "object" && config !== null && "failureStrategy" in config) {
      this.failureStrategy = config.failureStrategy || "fail";
    }
  }

  install(app: KarinApplication) {
    // Initialize client during install phase so it's available for DI
    let resolvedConfig: string | any;

    if (typeof this.config === "function") {
      resolvedConfig = this.config();
    } else if (typeof this.config === "string") {
      resolvedConfig = this.config;
    } else if ("url" in this.config || "options" in this.config) {
      // Objeto mixto Karin
      const url = typeof this.config.url === "function"
        ? this.config.url()
        : this.config.url;

      const options = typeof this.config.options === "function"
        ? this.config.options()
        : this.config.options;

      resolvedConfig = { url, options };
    } else {
      // RedisOptions directo
      resolvedConfig = this.config;
    }

    const redisOptions: any = { lazyConnect: true, showFriendlyErrorStack: true };

    if (typeof resolvedConfig === "string") {
      this.client = new Redis(resolvedConfig, redisOptions);
    } else if (resolvedConfig.url || resolvedConfig.options) {
      const userOptions = { ...resolvedConfig.options, ...redisOptions };
      this.client = resolvedConfig.url
        ? new Redis(resolvedConfig.url, userOptions)
        : new Redis(userOptions);
    } else {
      this.client = new Redis({ ...resolvedConfig, ...redisOptions });
    }

    this.client.on("error", (err) => {
      // Silent error handler to prevent unhandled rejections
    });

    // Register client in DI container immediately
    container.registerInstance(REDIS_CLIENT_TOKEN, this.client);
  }

  async onPluginInit() {
    this.logger.log("Initializing connection...");

    try {
      await this.client.connect();
      this.logger.log("✅ Connection established");
    } catch (error: any) {
      const msg = `Connection failed: ${error.message}`;

      if (this.failureStrategy === "fail") {
        this.logger.error(`❌ ${msg}`);
        this.logger.error(
          "🛑 Stopping app startup because Redis is required (failureStrategy='fail')."
        );
        throw error;
      } else {
        this.logger.warn(`⚠️ ${msg}`);
        this.logger.warn(
          "⚠️ App continuing without Redis (failureStrategy='warn'). Injecting disconnected client."
        );
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
