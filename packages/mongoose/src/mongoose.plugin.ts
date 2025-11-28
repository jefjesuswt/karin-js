import {
  type KarinPlugin,
  type KarinApplication,
  Logger,
  container,
} from "@karin-js/core";
import mongoose, { type ConnectOptions, type Mongoose } from "mongoose";
import { SCHEMA_METADATA, SCHEMAS_REGISTRY } from "./utils/decorators";
import { SchemaFactory } from "./utils/schema.factory"; // Importamos la factory

export interface MongoosePluginOptions {
  uri: string;
  options?: ConnectOptions;
}

export class MongoosePlugin implements KarinPlugin {
  name = "MongoosePlugin";
  private logger = new Logger("Mongoose");
  private connection: Mongoose | null = null;

  constructor(private readonly config: MongoosePluginOptions) {}

  install(app: KarinApplication) {
    // FASE 1: Construcción y Registro de Modelos
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
      this.logger.warn("No schemas found via @Schema decorator.");
      return;
    }

    for (const ModelClass of SCHEMAS_REGISTRY) {
      // 1. Obtener Metadatos
      const meta = Reflect.getMetadata(SCHEMA_METADATA, ModelClass);
      const modelName = meta?.name || ModelClass.name;

      // 2. Generar el Schema real usando la Fábrica
      const schema = SchemaFactory.createForClass(ModelClass as Function);

      // 3. Crear el Modelo de Mongoose REAL
      // Nota: mongoose.model registra el modelo globalmente en la conexión por defecto
      const modelInstance = mongoose.model(modelName, schema);

      // 4. Registrar la INSTANCIA del modelo en el contenedor de Karin
      // Ahora cuando inyectes esto, recibirás el modelo de Mongoose (con .find, .create, etc.)
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
