import {
  type KarinPlugin,
  type KarinApplication,
  Logger,
  container,
} from "@karin-js/core";
import mongoose, { type ConnectOptions, type Mongoose, Model } from "mongoose";
import { getModelToken } from "./utils";
import { Glob } from "bun"; // Usamos Glob de Bun
import { join } from "path";

export interface MongoosePluginOptions {
  uri: string;
  options?: ConnectOptions;
  /** Lista manual de modelos */
  models?: Model<any>[];
  /** * Patrón Glob para escanear modelos automáticamente.
   * Ej: './src/**\/*.schema.ts'
   */
  scanModels?: string;
}

export class MongoosePlugin implements KarinPlugin {
  name = "MongoosePlugin";
  private logger = new Logger("Mongoose");
  private connection: Mongoose | null = null;

  constructor(private readonly config: MongoosePluginOptions) {}

  // install corre sincrónicamente al hacer app.use()
  // Pero el escaneo es asíncrono, así que lo movemos a onPluginInit
  install(app: KarinApplication) {
    if (this.config.models) {
      this.registerModels(this.config.models);
    }
  }

  async onPluginInit() {
    try {
      // 1. Escaneo Automático
      if (this.config.scanModels) {
        await this.scanAndRegisterModels(this.config.scanModels);
      }

      // 2. Conexión
      const safeUri = this.config.uri.replace(
        /\/\/([^:]+):([^@]+)@/,
        "//***:***@"
      );
      this.logger.log(`Connecting to ${safeUri}...`);

      this.connection = await mongoose.connect(
        this.config.uri,
        this.config.options
      );
      container.registerInstance("MONGO_CONNECTION", this.connection);

      this.logger.log("✅ Connected successfully");
    } catch (error: any) {
      this.logger.error(`❌ Connection failed: ${error.message}`);
      throw error;
    }
  }

  private registerModels(models: Model<any>[]) {
    for (const model of models) {
      const token = getModelToken(model.modelName);
      container.registerInstance(token, model);
      this.logger.debug(`Model registered: ${model.modelName} -> ${token}`);
    }
  }

  private async scanAndRegisterModels(pattern: string) {
    const glob = new Glob(pattern);
    const cwd = process.cwd();
    this.logger.debug(`Scanning models in: ${pattern}`);

    for await (const file of glob.scan(cwd)) {
      const absolutePath = join(cwd, file);
      try {
        const module = await import(absolutePath);

        // Buscamos exportaciones que sean modelos de Mongoose
        const foundModels: Model<any>[] = [];

        for (const key of Object.keys(module)) {
          const value = module[key];
          // Heurística: ¿Es un Modelo de Mongoose?
          // value.prototype es undefined en modelos compilados, pero value.modelName existe
          if (value && value.modelName && typeof value.find === "function") {
            foundModels.push(value);
          }
        }

        if (foundModels.length > 0) {
          this.registerModels(foundModels);
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to import model file ${file}: ${error.message}`
        );
      }
    }
  }

  async onPluginDestroy() {
    if (this.connection) {
      await this.connection.disconnect();
      this.logger.log("Disconnected gracefully");
    }
  }
}
