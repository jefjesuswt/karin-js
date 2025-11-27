import "reflect-metadata";
import pc from "picocolors";
import { container } from "tsyringe";
import {
  CONTROLLER_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  PARAMS_METADATA,
  GUARDS_METADATA,
  PIPES_METADATA,
  FILTER_CATCH_EXCEPTIONS,
  FILTER_METADATA,
  INTERCEPTORS_METADATA,
} from "../decorators/constants";
import { Logger } from "../logger";
import { KarinApplication } from "../karin.application";
import { KarinExecutionContext } from "../context/execution-context";
import type {
  IHttpAdapter,
  CanActivate,
  PipeTransform,
  ExceptionFilter,
  KarinInterceptor,
  CallHandler,
} from "../interfaces";
import { ParamsResolver } from "./param-resolver";
import type { RouteParamMetadata } from "../decorators";
import { BaseExceptionFilter } from "../exceptions/base-exception.filter";
import {
  isConstructor,
  isExceptionFilter,
  isInterceptor,
  isObject,
} from "../utils/type-guards";

export class RouterExplorer {
  private logger = new Logger("RouterExplorer");
  private paramsResolver = new ParamsResolver();
  private defaultFilter = new BaseExceptionFilter();

  constructor(private readonly adapter: IHttpAdapter) {}

  public explore(app: KarinApplication, ControllerClass: any) {
    if (!container.isRegistered(ControllerClass)) {
      container.registerSingleton(ControllerClass);
    }
    const controllerInstance = container.resolve(ControllerClass);

    if (!isObject(controllerInstance)) {
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
    const classInterceptors = (Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      ControllerClass
    ) || []) as KarinInterceptor[];

    const proto = Object.getPrototypeOf(controllerInstance);
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== "constructor"
    );

    for (const methodName of methodNames) {
      const method = controllerInstance[methodName];
      if (typeof method !== "function") continue;

      const hasMeta = Reflect.hasMetadata(METHOD_METADATA, method);

      if (hasMeta) {
        this.registerRoute(
          app,
          controllerInstance,
          ControllerClass,
          method,
          methodName,
          prefix,
          classGuards,
          classPipes,
          classInterceptors
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
    classPipes: PipeTransform[],
    classInterceptors: KarinInterceptor[]
  ) {
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, method) as string;
    const routePath = Reflect.getMetadata(PATH_METADATA, method) as string;

    let fullPath = `/${prefix}/${routePath}`.replace(/\/+/g, "/");
    if (fullPath.length > 1 && fullPath.endsWith("/"))
      fullPath = fullPath.slice(0, -1);

    const methodGuards = (Reflect.getMetadata(GUARDS_METADATA, method) ||
      []) as CanActivate[];
    const methodPipes = (Reflect.getMetadata(PIPES_METADATA, method) ||
      []) as PipeTransform[];
    const methodInterceptors = (Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      method
    ) || []) as KarinInterceptor[];

    const allInterceptors = [...classInterceptors, ...methodInterceptors];

    const paramsMeta: RouteParamMetadata[] =
      Reflect.getMetadata(PARAMS_METADATA, controllerInstance, methodName) ||
      [];

    const adapterMethod = (this.adapter as any)[httpMethod.toLowerCase()];

    const methodColor = this.getMethodColor(httpMethod);
    const coloredMethod = pc.bold(methodColor(httpMethod.padEnd(7))); // 7 espacios para alinear (DELETE es largo)

    // 2. Ruta: Blanca billante
    const routeInfo = pc.yellow(fullPath);

    // 3. Separador: "::" en gris, se ve técnico y limpio
    const separator = pc.dim("::");

    // 4. Controlador: Cyan (Azul neón), destaca mucho más que el gris
    const controllerInfo = pc.cyan(controllerClass.name);

    // Resultado: GET     /users :: UsersController
    this.logger.log(
      `${coloredMethod} ${controllerInfo} ${separator} ${routeInfo}`
    );

    if (adapterMethod) {
      adapterMethod.call(this.adapter, fullPath, async (ctx: any) => {
        try {
          // 1. CREAMOS EL CONTEXTO (Esto ya lo tenías)
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
              throw new Error("Forbidden resource");
            }
          }

          const args = await this.paramsResolver.resolve(
            ctx,
            paramsMeta,
            [...app.getGlobalPipes(), ...classPipes, ...methodPipes],
            this.adapter,
            executionContext
          );

          // 3. Interceptors & Handler execution
          const baseHandler: CallHandler = {
            handle: async () => method.apply(controllerInstance, args),
          };

          const executionChain = await this.composeInterceptors(
            allInterceptors,
            baseHandler,
            executionContext
          );

          return await executionChain.handle();
        } catch (error: any) {
          return this.handleException(error, ctx, app, controllerClass, method);
        }
      });
    }
  }

  private async handleException(
    exception: any,
    ctx: any,
    app: KarinApplication,
    ControllerClass: any,
    method: Function
  ) {
    const methodFilters = (Reflect.getMetadata(FILTER_METADATA, method) ||
      []) as (ExceptionFilter | Function)[];
    const classFilters = (Reflect.getMetadata(
      FILTER_METADATA,
      ControllerClass
    ) || []) as (ExceptionFilter | Function)[];
    const globalFilters = app.getGlobalFilters();
    const allFilters = [...methodFilters, ...classFilters, ...globalFilters];

    for (const filterOrClass of allFilters) {
      const filterInstance = isConstructor(filterOrClass)
        ? container.resolve(filterOrClass as any)
        : filterOrClass;

      if (!isExceptionFilter(filterInstance)) continue;

      const constructor = Object.getPrototypeOf(filterInstance).constructor;
      const catchMetatypes =
        Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, constructor) || [];

      const handlesException =
        catchMetatypes.length === 0 ||
        catchMetatypes.some((meta: any) => exception instanceof meta);

      if (handlesException) {
        const host = new KarinExecutionContext(
          this.adapter,
          ctx,
          ControllerClass,
          method
        ).switchToHttp();

        return filterInstance.catch(exception, host);
      }
    }

    const host = new KarinExecutionContext(
      this.adapter,
      ctx,
      ControllerClass,
      method
    ).switchToHttp();

    return this.defaultFilter.catch(exception, host);
  }

  private async composeInterceptors(
    interceptors: any[],
    handler: CallHandler,
    context: KarinExecutionContext
  ): Promise<CallHandler> {
    let next = handler;

    for (let i = interceptors.length - 1; i >= 0; i--) {
      const interceptorOrClass = interceptors[i];
      const instance = isConstructor(interceptorOrClass)
        ? container.resolve(interceptorOrClass as any)
        : interceptorOrClass;

      if (!isInterceptor(instance)) continue;

      const currentInterceptor = instance;
      const currentNext = next;

      next = {
        handle: async () => {
          return currentInterceptor.intercept(context, currentNext);
        },
      };
    }
    return next;
  }

  private getMethodColor(method: string) {
    switch (method) {
      case "GET":
        return pc.green;
      case "POST":
        return pc.yellow;
      case "PUT":
        return pc.blue;
      case "DELETE":
        return pc.red;
      case "PATCH":
        return pc.magenta;
      default:
        return pc.white;
    }
  }
}
