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

export interface ConfigPluginOptions<T = any> {
  envFilePath?: string;
  /** Opción A: Schema de Zod para validación estricta */
  schema?: ZodSchema<T>;
  /** Opción B: Función simple para construir la config manualmente */
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
    // 1. Cargar archivo .env (Silenciosamente)
    const envPath = this.options.envFilePath
      ? this.options.envFilePath
      : join(app.getRootPath(), ".env");

    const originalLog = console.log;
    let result: DotenvConfigOutput = {};

    try {
      console.log = () => {};
      result = config({ path: envPath });
    } finally {
      console.log = originalLog;
    }

    if (result.error) {
      if (this.options.required) {
        this.logger.error(
          `❌ Fatal: Environment file not found at: ${envPath}`
        );
        process.exit(1);
      }
      // Warn solo si no es producción para no ensuciar logs
      if (process.env.NODE_ENV !== "production") {
        this.logger.warn(`⚠️  No .env file found. Using defaults.`);
      }
    }

    // 2. Determinar la Configuración
    let configData: any;

    if (this.options.load) {
      configData = this.options.load();
    } else if (this.options.schema) {
      const validation = this.options.schema.safeParse(process.env);
      if (!validation.success) {
        const zerr = validation.error as ZodError<any>;
        this.logger.error("❌ Configuration validation failed:");
        zerr.issues.forEach((err) => {
          this.logger.error(`   - ${err.path.join(".")}: ${err.message}`);
        });
        this.logger.error("🛑 Startup aborted due to invalid configuration.");
        process.exit(1);
      }
      configData = validation.data;
    } else {
      // Fallback: Crudo
      configData = process.env;
    }

    // 3. Registrar Servicio
    this.service = new ConfigService(configData);
    container.registerInstance(ConfigService, this.service);
    container.registerInstance("CONFIG_SERVICE", this.service);

    // Log discreto
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
