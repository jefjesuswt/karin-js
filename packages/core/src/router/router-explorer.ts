import "reflect-metadata";
import { container } from "tsyringe";
import {
  CONTROLLER_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  PARAMS_METADATA,
  GUARDS_METADATA,
  PIPES_METADATA,
} from "../decorators/constants";
import { Logger } from "../logger";
import { KarinApplication } from "../karin.application";
import { KarinExecutionContext } from "../context/execution-context";
import { HttpException } from "../exceptions/http.exception";
import type { IHttpAdapter, CanActivate, PipeTransform } from "../interfaces";
import { isConstructor, isObject } from "../utils/type-guards";
import { ParamsResolver } from "./param-resolver";
import type { RouteParamMetadata } from "../decorators";

export class RouterExplorer {
  private logger = new Logger("RouterExplorer");
  private paramsResolver = new ParamsResolver();

  constructor(private readonly adapter: IHttpAdapter) {}

  public explore(app: KarinApplication, ControllerClass: any) {
    if (!container.isRegistered(ControllerClass)) {
      container.registerSingleton(ControllerClass);
    }
    const controllerInstance = container.resolve(ControllerClass);

    if (!isObject(controllerInstance)) return;

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
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== "constructor"
    );

    for (const methodName of methodNames) {
      const method = controllerInstance[methodName];
      if (typeof method !== "function") continue;

      if (Reflect.hasMetadata(METHOD_METADATA, method)) {
        this.registerRoute(
          app,
          controllerInstance,
          ControllerClass,
          method,
          methodName,
          prefix,
          classGuards,
          classPipes
        );
      }
    }
  }

  private registerRoute(
    app: KarinApplication,
    controllerInstance: any,
    controllerClass: any,
    method: Function,
    methodName: string,
    prefix: string,
    classGuards: CanActivate[],
    classPipes: PipeTransform[]
  ) {
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, method) as string;
    const routePath = Reflect.getMetadata(PATH_METADATA, method) as string;

    // Normalización del path
    let fullPath = `/${prefix}/${routePath}`.replace(/\/+/g, "/");
    if (fullPath.length > 1 && fullPath.endsWith("/"))
      fullPath = fullPath.slice(0, -1);

    const methodGuards = (Reflect.getMetadata(GUARDS_METADATA, method) ||
      []) as CanActivate[];
    const methodPipes = (Reflect.getMetadata(PIPES_METADATA, method) ||
      []) as PipeTransform[];
    const paramsMeta: RouteParamMetadata[] =
      Reflect.getMetadata(PARAMS_METADATA, controllerInstance, methodName) ||
      [];

    const adapterMethod = (this.adapter as any)[httpMethod.toLowerCase()];

    if (adapterMethod) {
      adapterMethod.call(this.adapter, fullPath, async (ctx: any) => {
        try {
          const executionContext = new KarinExecutionContext(
            this.adapter,
            ctx,
            controllerClass,
            method
          );

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
            const canActivate = await (instance as CanActivate).canActivate(
              executionContext
            );
            if (!canActivate) {
              // Aquí podrías usar una ForbiddenException
              throw new Error("Forbidden resource");
            }
          }

          // 2. Pipes & Args
          const args = await this.paramsResolver.resolve(
            ctx,
            paramsMeta,
            [...app.getGlobalPipes(), ...classPipes, ...methodPipes],
            this.adapter
          );

          // 3. Handler execution
          return await method.apply(controllerInstance, args);
        } catch (error: any) {
          return this.handleError(error);
        }
      });

      this.logger.log(`Mapped {${fullPath}, ${httpMethod}} route`);
    }
  }

  private handleError(error: any) {
    // Lógica de error extraída
    let status = 500;
    let body: any = { message: "Internal Server Error" };

    if (error instanceof HttpException) {
      status = error.status;
      const response = error.response;
      if (typeof response === "object") {
        body = { statusCode: status, ...response };
      } else {
        body = { statusCode: status, message: response };
      }
    } else {
      this.logger.error(error.message);
      if (process.env.NODE_ENV !== "production") {
        body.details = error.message;
      }
    }

    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
