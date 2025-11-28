import {
  type KarinPlugin,
  type KarinApplication,
  Logger,
  container,
} from "@karin-js/core";
import { config, type DotenvConfigOutput } from "dotenv";
import { ZodError, type ZodSchema } from "zod";
import { ConfigService } from "./config.service";
import { join } from "path";
import { existsSync } from "fs";

export interface ConfigPluginOptions<T = any> {
  envFilePath?: string;
  schema?: ZodSchema<T>;
  load?: () => T;
  passthrough?: boolean;
  required?: boolean;
}

export class ConfigPlugin<T = any> implements KarinPlugin {
  name = "ConfigPlugin";
  private logger = new Logger("Config");
  private service!: ConfigService<T>;

  constructor(private readonly options: ConfigPluginOptions<T> = {}) {}

  install(app: KarinApplication) {
    let loadedEnv: any = {};

    const isNodeLike =
      typeof process !== "undefined" &&
      (typeof process.versions?.node !== "undefined" ||
        typeof Bun !== "undefined");

    if (isNodeLike && !this.options.load) {
      const envPath = this.options.envFilePath
        ? this.options.envFilePath
        : join(app.getRootPath(), ".env");

      if (existsSync(envPath)) {
        const originalLog = console.log;
        try {
          console.log = () => {};
          const result = config({ path: envPath });
          if (result.error) {
            throw result.error;
          }
        } catch (err) {
          this.logger.warn(
            `Could not load .env file: ${(err as Error).message}`
          );
        } finally {
          console.log = originalLog;
        }
      } else {
        if (this.options.required && process.env.NODE_ENV !== "production") {
          this.logger.warn(`⚠️ .env file not found at ${envPath}`);
        }
      }
    }

    let configData: any;

    if (this.options.load) {
      configData = this.options.load();
    } else if (this.options.schema) {
      const source = typeof process !== "undefined" ? process.env : {};

      const validation = this.options.schema.safeParse(source);
      if (!validation.success) {
        const zerr = validation.error as ZodError<any>;
        this.logger.error("❌ Configuration validation failed:");
        zerr.issues.forEach((err) => {
          this.logger.error(`   - ${err.path.join(".")}: ${err.message}`);
        });

        this.logger.error("🛑 Startup aborted due to invalid configuration.");

        if (typeof process !== "undefined" && process.exit) {
          process.exit(1);
        } else {
          throw new Error("Invalid Configuration");
        }
      }
      configData = validation.data;
    } else {
      configData = typeof process !== "undefined" ? process.env : {};
    }

    this.service = new ConfigService(configData);
    container.registerInstance(ConfigService, this.service);
    container.registerInstance("CONFIG_SERVICE", this.service);

    const keysCount = Object.keys(configData).length;
    this.logger.log(`Loaded configuration (${keysCount} keys)`);
  }

  public get<K extends keyof T>(key: K): T[K] {
    if (!this.service) {
      throw new Error(
        "ConfigPlugin has not been installed. Call app.use(plugin) first."
      );
    }
    return this.service.get(key);
  }
}
