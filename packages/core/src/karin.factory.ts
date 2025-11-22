import "reflect-metadata";
import { container } from "tsyringe";
import { Glob } from "bun";
import { join } from "path";
// ❌ Eliminamos imports de h3 (readBody, getQuery, H3Event, etc.)

import {
  CONTROLLER_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  PARAMS_METADATA,
  GUARDS_METADATA,
  PIPES_METADATA,
} from "./decorators/constants";
import type { RouteParamMetadata } from "./decorators/params";
import { Logger } from "./logger";
import { isConstructor, isObject } from "./utils/type-guards";
import { KarinApplication } from "./karin.application";
import type {
  CanActivate,
  PipeTransform,
  ArgumentMetadata,
  IHttpAdapter,
} from "./interfaces";
import { HttpException } from "./exceptions/http.exception";

type Constructor<T = any> = new (...args: any[]) => T;

export class KarinFactory {
  private static logger = new Logger("KarinFactory");

  static async create(
    adapter: IHttpAdapter,
    options: { scan?: string } = {}
  ): Promise<KarinApplication> {
    const app = new KarinApplication(adapter);
    const scanPath = options.scan || "./src/**/*.controller.ts";
    const glob = new Glob(scanPath);
    const cwd = process.cwd();

    this.logger.info(`Scanning controllers in: ${scanPath}`);

    for await (const file of glob.scan(cwd)) {
      const absolutePath = join(cwd, file);
      const module = await import(absolutePath);

      for (const key in module) {
        const CandidateClass = module[key];
        if (
          isConstructor(CandidateClass) &&
          Reflect.hasMetadata(CONTROLLER_METADATA, CandidateClass)
        ) {
          this.registerController(app, adapter, CandidateClass);
        }
      }
    }

    return app;
  }

  private static registerController(
    app: KarinApplication,
    adapter: IHttpAdapter,
    ControllerClass: Constructor
  ) {
    if (!container.isRegistered(ControllerClass)) {
      container.registerSingleton(ControllerClass);
    }

    const controllerInstance = container.resolve(ControllerClass);

    if (!isObject(controllerInstance)) {
      this.logger.error(
        `Controller instance for ${ControllerClass.name} is not an object.`
      );
      return;
    }

    const prefix = Reflect.getMetadata(
      CONTROLLER_METADATA,
      ControllerClass
    ) as string;

    const classGuards = (Reflect.getMetadata(
      GUARDS_METADATA,
      ControllerClass
    ) || []) as CanActivate[];

    const classPipes = (Reflect.getMetadata(PIPES_METADATA, ControllerClass) ||
      []) as PipeTransform[];

    const proto = Object.getPrototypeOf(controllerInstance);
    const methods = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== "constructor"
    );

    for (const methodName of methods) {
      const method = controllerInstance[methodName];

      if (typeof method !== "function") continue;

      if (Reflect.hasMetadata(METHOD_METADATA, method)) {
        const httpMethod = Reflect.getMetadata(
          METHOD_METADATA,
          method
        ) as string;
        const routePath = Reflect.getMetadata(PATH_METADATA, method) as string;
        let fullPath = `/${prefix}/${routePath}`.replace(/\/+/g, "/");
        if (fullPath.length > 1 && fullPath.endsWith("/")) {
          fullPath = fullPath.slice(0, -1);
        }

        const methodGuards = (Reflect.getMetadata(GUARDS_METADATA, method) ||
          []) as CanActivate[];
        const methodPipes = (Reflect.getMetadata(PIPES_METADATA, method) ||
          []) as PipeTransform[];

        const paramsMeta: RouteParamMetadata[] =
          Reflect.getMetadata(
            PARAMS_METADATA,
            controllerInstance,
            methodName
          ) || [];

        const adapterMethod = (adapter as any)[httpMethod.toLowerCase()];

        if (adapterMethod) {
          // ✅ Usamos un contexto genérico (ctx) en lugar de H3Event
          adapterMethod.call(adapter, fullPath, async (ctx: any) => {
            try {
              // 1. Guards
              const allGuards = [
                ...app.getGlobalGuards(),
                ...classGuards,
                ...methodGuards,
              ];

              for (const guard of allGuards) {
                const instance = isConstructor(guard)
                  ? container.resolve(guard)
                  : guard;

                // Pasamos el ctx genérico
                const canActivate = await (instance as CanActivate).canActivate(
                  ctx
                );
                if (!canActivate) {
                  throw new Error("Forbidden resource");
                }
              }

              // 2. Resolve Args & Pipes
              // ✅ Pasamos el adapter para que él extraiga los datos
              const args = await this.resolveArgs(
                ctx,
                paramsMeta,
                [...app.getGlobalPipes(), ...classPipes, ...methodPipes],
                adapter
              );

              // 3. Execute Handler
              return method.apply(controllerInstance, args);
            } catch (error: any) {
              let status = 500;
              let body: any = { message: "Internal Server Error" };

              if (error instanceof HttpException) {
                status = error.status;
                const response = error.response;
                // Si la respuesta es un objeto, lo mezclamos con el status
                if (typeof response === "object") {
                  body = {
                    statusCode: status,
                    ...response,
                  };
                } else {
                  body = {
                    statusCode: status,
                    message: response,
                  };
                }
              } else {
                // Logueamos solo los errores 500 reales (bugs nuestros)
                this.logger.error(error.message);
                // Opcional: En desarrollo mostrar el stack trace
                if (process.env.NODE_ENV !== "production") {
                  body.details = error.message;
                }
              }

              // Devolvemos un objeto Response estándar
              // Nuestros adaptadores (H3 y Hono) saben manejar esto.
              return new Response(JSON.stringify(body), {
                status,
                headers: { "Content-Type": "application/json" },
              });
            }
          });

          this.logger.log(`Mapped {${fullPath}, ${httpMethod}} route`);
        }
      }
    }
  }

  private static async resolveArgs(
    ctx: any, // Contexto genérico
    params: RouteParamMetadata[],
    combinedPipes: PipeTransform[],
    adapter: IHttpAdapter // ✅ Inyectamos el adaptador
  ): Promise<unknown[]> {
    const args: unknown[] = [];
    params.sort((a, b) => a.index - b.index);

    for (const param of params) {
      let value: unknown = undefined;
      let metaType: ArgumentMetadata["type"] = "custom";

      // ✅ Delegamos la extracción al adaptador
      switch (param.type) {
        case "BODY":
          value = await adapter.readBody(ctx);
          metaType = "body";
          break;
        case "QUERY":
          value = adapter.getQuery(ctx);
          metaType = "query";
          break;
        case "PARAM":
          value = adapter.getParams(ctx);
          metaType = "param";
          break;
        case "HEADERS":
          value = adapter.getHeaders(ctx);
          metaType = "custom";
          break;
        case "REQ":
          value = adapter.getRequest(ctx);
          break;
        case "RES":
          value = adapter.getResponse(ctx);
          break;
      }

      if (param.data && isObject(value)) {
        value = value[param.data];
      }

      // Pipes logic...
      const paramPipes = (param.pipes || []).map((p) =>
        isConstructor(p) ? container.resolve(p) : p
      );
      const pipesToRun = [...combinedPipes, ...paramPipes];

      for (const pipe of pipesToRun) {
        const pipeInstance = isConstructor(pipe)
          ? container.resolve(pipe)
          : pipe;

        if ((pipeInstance as PipeTransform).transform) {
          value = await (pipeInstance as PipeTransform).transform(value, {
            type: metaType,
            data: param.data,
          });
        }
      }

      args[param.index] = value;
    }
    return args;
  }
}
