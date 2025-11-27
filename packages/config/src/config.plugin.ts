import {
  type KarinPlugin,
  type KarinApplication,
  Logger,
  container,
} from "@karin-js/core";
import { config } from "dotenv";
import { ZodError, ZodSchema } from "zod";
import { ConfigService } from "./config.service";
import { join } from "path";

export interface ConfigPluginOptions<T = any> {
  envFilePath?: string;
  schema?: ZodSchema<T>;
  passthrough?: boolean;
}

export class ConfigPlugin implements KarinPlugin {
  name = "ConfigPlugin";
  private logger = new Logger("Config");

  constructor(private readonly options: ConfigPluginOptions = {}) {}

  install(app: KarinApplication) {
    const envPath = this.options.envFilePath
      ? this.options.envFilePath
      : join(process.cwd(), ".env");

    const result = config({ path: envPath });

    if (result.error) {
      this.logger.warn(
        `No .env file found at ${this.options.envFilePath || ".env"}`
      );
    } else {
      // (Opcional) Expandir variables: API_URL=${HOST}:${PORT}
      // expand(result);
      this.logger.log("Environment variables loaded");
    }

    // 2. Fusionar process.env con lo cargado
    let configData = { ...process.env };

    // 3. Validación con Zod
    if (this.options.schema) {
      const validation = this.options.schema.safeParse(configData);

      if (!validation.success) {
        const zerr = validation.error as ZodError<any>;

        zerr.issues.forEach((err) => {
          this.logger.error(` - ${err.path.join(".")}: ${err.message}`);
        });

        throw new Error("Config validation failed");
      }

      // Usamos los datos parseados/transformados por Zod
      configData = validation.data;
    }

    // 4. Registrar el ConfigService en el contenedor
    // Creamos una instancia con los datos ya validados
    const service = new ConfigService(configData);

    // Registramos 'ConfigService' (clase) y un token string por si acaso
    container.registerInstance(ConfigService, service);
    container.registerInstance("CONFIG_SERVICE", service);

    this.logger.log("ConfigService registered ✅");
  }
}
