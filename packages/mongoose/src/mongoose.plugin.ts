import {
  type KarinPlugin,
  type KarinApplication,
  Logger,
  container,
} from "@karin-js/core";
import mongoose, { type ConnectOptions, type Mongoose } from "mongoose";
import { SCHEMA_METADATA, SCHEMAS_REGISTRY } from "./utils/decorators";
import { SchemaFactory } from "./utils/schema.factory";
import { MongooseExceptionFilter } from "./mongoose-exception.filter";

export interface MongoosePluginOptions {
  uri: string | (() => string);
  options?: ConnectOptions | (() => ConnectOptions);
  models?: Function[];

  autoRegisterExceptionFilter?: boolean;
}

export class MongoosePlugin implements KarinPlugin {
  name = "MongoosePlugin";
  private logger = new Logger("Mongoose");
  private connection: Mongoose | null = null;

  constructor(private readonly config: MongoosePluginOptions) { }

  install(app: KarinApplication) {
    // ✅ ENTERPRISE FEATURE: Auto-register exception filter
    if (this.config.autoRegisterExceptionFilter !== false) {
      app.useGlobalFilters(new MongooseExceptionFilter());
      this.logger.log("✅ MongooseExceptionFilter registered automatically");
    }

    if (this.config.models && this.config.models.length > 0) {
      this.config.models.forEach((model) => {
        SCHEMAS_REGISTRY.add(model);
      });
      this.logger.log(
        `Manually registered ${this.config.models.length} entities for Serverless execution.`
      );
    }

    this.registerModels();
  }

  async onPluginInit() {
    this.registerModels();
    try {
      const uri = typeof this.config.uri === "function" ? this.config.uri() : this.config.uri;
      if (!uri) throw new Error("URI is required");

      const connectionOptions: ConnectOptions =
        typeof this.config.options === "function"
          ? this.config.options()
          : (this.config.options || {});

      this.connection = await mongoose.connect(
        uri,
        connectionOptions
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
      const meta = Reflect.getMetadata(SCHEMA_METADATA, ModelClass);

      if (!meta) {
        this.logger.warn(
          `Class '${ModelClass.name}' is registered but missing @Schema decorator.`
        );
        continue;
      }

      const modelName = meta.name || ModelClass.name;
      const schema = SchemaFactory.createForClass(ModelClass as Function);

      const modelInstance =
        mongoose.models[modelName] || mongoose.model(modelName, schema);

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
