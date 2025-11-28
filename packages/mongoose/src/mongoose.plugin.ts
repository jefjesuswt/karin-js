import {
  type KarinPlugin,
  type KarinApplication,
  Logger,
  container,
} from "@karin-js/core";
import mongoose, { type ConnectOptions, type Mongoose } from "mongoose";
import { SCHEMA_METADATA, SCHEMAS_REGISTRY } from "./utils/decorators";
import { SchemaFactory } from "./utils/schema.factory";

export interface MongoosePluginOptions {
  uri: string;
  options?: ConnectOptions;
  /**
   * Lista explícita de modelos para entornos Serverless/Bundled.
   * Evita que el Tree-Shaking elimine las entidades no referenciadas.
   */
  models?: Function[];
}

export class MongoosePlugin implements KarinPlugin {
  name = "MongoosePlugin";
  private logger = new Logger("Mongoose");
  private connection: Mongoose | null = null;

  constructor(private readonly config: MongoosePluginOptions) {}

  install(app: KarinApplication) {
    // FASE 0: Registro Manual (Vital para Serverless)
    // Si el usuario pasa modelos explícitos, los aseguramos en el registro
    if (this.config.models && this.config.models.length > 0) {
      this.config.models.forEach((model) => {
        SCHEMAS_REGISTRY.add(model);
      });
      this.logger.log(
        `Manually registered ${this.config.models.length} entities for Serverless execution.`
      );
    }

    // FASE 1: Construcción y Registro de Modelos en el DI
    this.registerModels();
  }

  async onPluginInit() {
    // FASE 2: Conexión
    try {
      if (!this.config.uri) throw new Error("URI is required");

      this.connection = await mongoose.connect(
        this.config.uri,
        this.config.options
      );

      container.registerInstance("MONGO_CONNECTION", this.connection);
      this.logger.log("✅ Connected to MongoDB");
    } catch (error: any) {
      this.logger.error(`Connection failed: ${error.message}`);
      throw error;
    }
  }

  private registerModels() {
    if (SCHEMAS_REGISTRY.size === 0) {
      this.logger.warn(
        "No schemas found. If you are in Serverless mode, verify 'models' array in options."
      );
      return;
    }

    for (const ModelClass of SCHEMAS_REGISTRY) {
      // 1. Validar que sea una clase decorada
      const meta = Reflect.getMetadata(SCHEMA_METADATA, ModelClass);

      if (!meta) {
        this.logger.warn(
          `Class '${ModelClass.name}' is registered but missing @Schema decorator.`
        );
        continue;
      }

      const modelName = meta.name || ModelClass.name;

      // 2. Generar Schema
      const schema = SchemaFactory.createForClass(ModelClass as Function);

      // 3. Crear instancia real de Mongoose
      // mongoose.models verifica si ya existe para evitar errores de recompilación (HMR)
      const modelInstance =
        mongoose.models[modelName] || mongoose.model(modelName, schema);

      // 4. Inyección de Dependencias
      const token = `MONGO_MODEL_${modelName.toUpperCase()}`;
      container.registerInstance(token, modelInstance);

      this.logger.log(`Model registered: ${modelName} -> ${token}`);
    }
  }

  async onPluginDestroy() {
    if (this.connection) {
      await this.connection.disconnect();
    }
  }
}
