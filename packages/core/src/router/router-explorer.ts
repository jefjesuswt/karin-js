import "reflect-metadata";
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
import { ForbiddenException } from "../exceptions/http.exception";
import pc from "picocolors";

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

    if (!isObject(controllerInstance)) return;

    const prefix = Reflect.getMetadata(
      CONTROLLER_METADATA,
      ControllerClass
    ) as string;

    // 👇 OPTIMIZACIÓN: Pre-resuelve los metadatos de clase UNA VEZ
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
    const classFilters = (Reflect.getMetadata(
      FILTER_METADATA,
      ControllerClass
    ) || []) as ExceptionFilter[];

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
          classPipes,
          classInterceptors,
          classFilters // Pasamos filtros de clase también
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
    classInterceptors: KarinInterceptor[],
    classFilters: ExceptionFilter[]
  ) {
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, method) as string;
    const routePath = Reflect.getMetadata(PATH_METADATA, method) as string;

    let fullPath = `/${prefix}/${routePath}`.replace(/\/+/g, "/");
    if (fullPath.length > 1 && fullPath.endsWith("/"))
      fullPath = fullPath.slice(0, -1);

    // Obtener metadatos del método
    const methodGuards = (Reflect.getMetadata(GUARDS_METADATA, method) ||
      []) as CanActivate[];
    const methodPipes = (Reflect.getMetadata(PIPES_METADATA, method) ||
      []) as PipeTransform[];
    const methodInterceptors = (Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      method
    ) || []) as KarinInterceptor[];
    const methodFilters = (Reflect.getMetadata(FILTER_METADATA, method) ||
      []) as ExceptionFilter[];

    const paramsMeta: RouteParamMetadata[] =
      Reflect.getMetadata(PARAMS_METADATA, controllerInstance, methodName) ||
      [];

    // 👇 OPTIMIZACIÓN CRÍTICA: Pre-resolver instancias (Singletons)
    // Esto ocurre en el arranque, NO en cada petición.
    const resolvedGuards = [
      ...app.getGlobalGuards(),
      ...classGuards,
      ...methodGuards,
    ].map((g) => (isConstructor(g) ? container.resolve(g) : g));

    const resolvedPipes = [
      ...app.getGlobalPipes(),
      ...classPipes,
      ...methodPipes,
    ].map((p) => (isConstructor(p) ? container.resolve(p) : p));

    const resolvedInterceptors = [
      ...classInterceptors,
      ...methodInterceptors, // Globales faltan aquí si existieran
    ]
      .map((i) => (isConstructor(i) ? container.resolve(i) : i))
      .filter((i) => isInterceptor(i)) as KarinInterceptor[]; // Validación temprana

    const resolvedFilters = [
      ...methodFilters,
      ...classFilters,
      ...app.getGlobalFilters(),
    ]
      .map((f) => (isConstructor(f) ? container.resolve(f) : f))
      .filter((f) => isExceptionFilter(f)); // Validación temprana

    // Ordenamos filtros una vez al inicio
    resolvedFilters.sort((a, b) => {
      const metaA =
        Reflect.getMetadata(
          FILTER_CATCH_EXCEPTIONS,
          Object.getPrototypeOf(a).constructor
        ) || [];
      const metaB =
        Reflect.getMetadata(
          FILTER_CATCH_EXCEPTIONS,
          Object.getPrototypeOf(b).constructor
        ) || [];
      const isCatchAllA = metaA.length === 0;
      const isCatchAllB = metaB.length === 0;
      if (isCatchAllA && !isCatchAllB) return 1;
      if (!isCatchAllA && isCatchAllB) return -1;
      return 0;
    });

    const adapterMethod = (this.adapter as any)[httpMethod.toLowerCase()];

    if (adapterMethod) {
      // Handler de la Petición (Hot Path) 🔥
      adapterMethod.call(this.adapter, fullPath, (ctx: any) => {
        const requestPromise = (async () => {
          try {
            const executionContext = new KarinExecutionContext(
              this.adapter,
              ctx,
              controllerClass,
              method
            );

            // 1. Guards (Loop optimizado con instancias ya resueltas)
            for (const guard of resolvedGuards) {
              const canActivate = await (guard as CanActivate).canActivate(
                executionContext
              );
              if (!canActivate) {
                throw new ForbiddenException("Forbidden resource");
              }
            }

            // 2. Pipes & Args (Pasamos pipes ya resueltos)
            const args = await this.paramsResolver.resolve(
              ctx,
              paramsMeta,
              resolvedPipes as PipeTransform[], // <-- Pipes listos
              this.adapter,
              executionContext
            );

            // 3. Interceptors (Usamos instancias listas)
            const baseHandler: CallHandler = {
              handle: async () => method.apply(controllerInstance, args),
            };

            const executionChain = await this.composeInterceptors(
              resolvedInterceptors, // <-- Interceptores listos
              baseHandler,
              executionContext
            );

            return await executionChain.handle();
          } catch (error: any) {
            // Pasamos los filtros ya resueltos para no buscarlos de nuevo
            return this.handleException(error, ctx, resolvedFilters, method);
          }
        })();
        return app.trackRequest(requestPromise);
      });

      // Logging (Código visual anterior...)
      const methodColor = this.getMethodColor(httpMethod);
      const coloredMethod = pc.bold(methodColor(httpMethod.padEnd(7)));
      const routeInfo = fullPath.padEnd(40);
      const separator = pc.dim("::");
      const controllerInfo = pc.cyan(controllerClass.name);
      this.logger.log(
        `${coloredMethod} ${routeInfo} ${separator} ${controllerInfo}`
      );
    }
  }

  // 👇 Método simplificado, ya recibe los filtros listos
  private async handleException(
    exception: any,
    ctx: any,
    resolvedFilters: any[],
    method: Function
  ) {
    for (const filterInstance of resolvedFilters) {
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
          null as any, // No necesitamos la clase aquí para el filtro base
          method
        ).switchToHttp();

        return filterInstance.catch(exception, host);
      }
    }

    const host = new KarinExecutionContext(
      this.adapter,
      ctx,
      null as any,
      method
    ).switchToHttp();

    return this.defaultFilter.catch(exception, host);
  }

  private async composeInterceptors(
    interceptors: KarinInterceptor[],
    handler: CallHandler,
    context: KarinExecutionContext
  ): Promise<CallHandler> {
    let next = handler;

    for (let i = interceptors.length - 1; i >= 0; i--) {
      const currentInterceptor = interceptors[i];
      const currentNext = next;

      if (!currentInterceptor) continue;

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
