import {
  type KarinPlugin,
  type KarinApplication,
  Logger,
} from "@karin-js/core";
import { OpenApiBuilder } from "./openapi.builder";
import { generateSwaggerHtml } from "./swagger-ui";

export interface OpenApiPluginOptions {
  path?: string; // ej: /docs
  title?: string;
  version?: string;
}

export class OpenApiPlugin implements KarinPlugin {
  name = "OpenApiPlugin";
  private logger = new Logger("OpenAPI");
  private app!: KarinApplication;

  constructor(private readonly options: OpenApiPluginOptions = {}) {}

  install(app: KarinApplication) {
    this.app = app;
  }

  async onPluginInit() {
    // 1. Validamos que haya controladores (usando tu nuevo método registerController)
    const controllers = this.app.getControllers();
    if (!controllers || controllers.length === 0) {
      this.logger.warn(
        "No controllers found via app.getControllers(). Docs might be empty."
      );
    }

    // 2. Construimos el JSON
    const builder = new OpenApiBuilder(this.app);
    const document = builder.build();

    // Personalización del documento
    if (this.options.title) document.info.title = this.options.title;
    if (this.options.version) document.info.version = this.options.version;

    // 3. Rutas
    const docPath = this.options.path || "/docs";
    const jsonPath = `${docPath}/json`;
    const adapter = this.app.getHttpAdapter();

    // Endpoint A: JSON crudo
    adapter.get(jsonPath, () => document);

    // Endpoint B: Interfaz Gráfica (HTML)
    adapter.get(docPath, () => {
      const html = generateSwaggerHtml({
        title: document.info.title,
        jsonUrl: jsonPath, // Vinculamos el HTML con la ruta del JSON
        version: "5.11.0",
      });

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    });

    // 4. Log final con enlace clicable
    const port = process.env.PORT || 3000;
    this.logger.log(`📚 OpenAPI Docs: http://localhost:${port}${docPath}`);
  }
}
