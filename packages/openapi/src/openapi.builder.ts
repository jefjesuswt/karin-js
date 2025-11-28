import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import {
  CONTROLLER_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  PARAMS_METADATA,
  type RouteParamMetadata,
  type KarinApplication,
} from "@karin-js/core";
import { ZodValidationPipe } from "@karin-js/core"; // Asegúrate de exportar esto en core/index.ts

export class OpenApiBuilder {
  private registry = new OpenAPIRegistry();

  constructor(private readonly app: KarinApplication) {}

  public build() {
    const controllers = this.app.getControllers();

    controllers.forEach((controller) => {
      this.processController(controller);
    });

    const generator = new OpenApiGeneratorV3(this.registry.definitions);
    return generator.generateDocument({
      openapi: "3.0.0",
      info: {
        title: "Karin-JS API",
        version: "1.0.0",
      },
    });
  }

  private processController(controller: any) {
    const prefix = Reflect.getMetadata(CONTROLLER_METADATA, controller);
    const proto = controller.prototype;
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== "constructor"
    );

    methodNames.forEach((methodName) => {
      const method = proto[methodName];
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);
      const path = Reflect.getMetadata(PATH_METADATA, method);

      if (httpMethod && path) {
        this.registerPath(
          controller,
          method,
          methodName,
          prefix,
          path,
          httpMethod
        );
      }
    });
  }

  private registerPath(
    controller: any,
    method: any,
    methodName: string,
    prefix: string,
    path: string,
    httpMethod: string
  ) {
    // Normalizar ruta (ej: /users/ + /create -> /users/create)
    const fullPath = `/${prefix}/${path}`.replace(/\/+/g, "/");

    // Convertir ruta estilo express :id a estilo swagger {id}
    const swaggerPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

    // Buscar ZodValidationPipe en los parámetros
    const params: RouteParamMetadata[] =
      Reflect.getMetadata(PARAMS_METADATA, controller.prototype, methodName) ||
      [];

    let requestBodySchema: any = undefined;

    // Buscar si hay un @Body con ZodValidationPipe
    const bodyParam = params.find((p) => p.type === "BODY");
    if (bodyParam && bodyParam.pipes) {
      // Buscamos una instancia de ZodValidationPipe
      const zodPipe = bodyParam.pipes.find(
        (p: any) => p instanceof ZodValidationPipe
      ) as ZodValidationPipe | undefined;

      if (zodPipe && zodPipe.schema) {
        requestBodySchema = {
          description: "Request Body",
          content: {
            "application/json": {
              schema: zodPipe.schema, // @asteasolutions/zod-to-openapi maneja esto
            },
          },
        };
      }
    }

    // Registrar en el registro de OpenAPI
    this.registry.registerPath({
      method: httpMethod.toLowerCase() as any,
      path: swaggerPath,
      tags: [controller.name.replace("Controller", "")],
      request: {
        body: requestBodySchema,
      },
      responses: {
        200: {
          description: "Successful response",
        },
      },
    });
  }
}
