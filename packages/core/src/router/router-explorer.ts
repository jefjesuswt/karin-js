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
  Type,
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
    // 1. Registramos en el contenedor pero NO instanciamos todavía
    if (!container.isRegistered(ControllerClass)) {
      container.registerSingleton(ControllerClass);
    }

    // 👇 CAMBIO CLAVE: Usamos el PROTOTIPO para leer metadatos sin instanciar
    // Esto evita el error de dependencia faltante al arrancar.
    const proto = ControllerClass.prototype;

    const prefix = Reflect.getMetadata(
      CONTROLLER_METADATA,
      ControllerClass
    ) as string;

    // Metadatos de clase
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

    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== "constructor"
    );

    for (const methodName of methodNames) {
      const method = proto[methodName]; // Leemos del prototipo
      if (typeof method !== "function") continue;

      if (Reflect.hasMetadata(METHOD_METADATA, method)) {
        this.registerRoute(
          app,
          ControllerClass, // Pasamos la CLASE, no la instancia
          method,
          methodName,
          prefix,
          classGuards,
          classPipes,
          classInterceptors,
          classFilters
        );
      }
    }
  }

  private registerRoute(
    app: KarinApplication,
    ControllerClass: Type<any>,
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

    // Metadatos del método
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

    // Params metadata también está en el prototipo
    const paramsMeta: RouteParamMetadata[] =
      Reflect.getMetadata(
        PARAMS_METADATA,
        ControllerClass.prototype, // Leemos del prototipo explícitamente
        methodName
      ) || [];

    // Pre-resolución de instancias (Guards, Pipes, etc.)
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

    const resolvedInterceptors = [...classInterceptors, ...methodInterceptors]
      .map((i) => (isConstructor(i) ? container.resolve(i) : i))
      .filter((i) => isInterceptor(i)) as KarinInterceptor[]; // Validación temprana

    const resolvedFilters = [
      ...methodFilters,
      ...classFilters,
      ...app.getGlobalFilters(),
    ]
      .map((f) => (isConstructor(f) ? container.resolve(f) : f))
      .filter((f): f is ExceptionFilter => isExceptionFilter(f)); // Validación temprana

    // Ordenamos filtros
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
      adapterMethod.call(this.adapter, fullPath, (ctx: any) => {
        // Envolvemos en una promesa para trackRequest (Graceful Shutdown)
        const requestPromise = (async () => {
          try {
            // 👇 LAZY INSTANTIATION: Resolvemos el controlador AQUÍ, dentro de la petición.
            // En este punto, app.use() ya corrió y los modelos están registrados.
            const controllerInstance = container.resolve(ControllerClass);

            const handlerMethod = Reflect.get(
              controllerInstance as object,
              methodName
            );

            if (typeof handlerMethod !== "function") {
              throw new Error(
                `Method '${methodName}' not found in controller instance '${ControllerClass.name}'`
              );
            }

            const handlerInstance = handlerMethod.bind(controllerInstance);

            const executionContext = new KarinExecutionContext(
              this.adapter,
              ctx,
              ControllerClass,
              handlerInstance
            );

            // 1. Guards
            for (const guard of resolvedGuards) {
              const canActivate = await (guard as CanActivate).canActivate(
                executionContext
              );
              if (!canActivate) {
                throw new ForbiddenException("Forbidden resource");
              }
            }

            // 2. Pipes & Args
            const args = await this.paramsResolver.resolve(
              ctx,
              paramsMeta,
              resolvedPipes as PipeTransform[],
              this.adapter,
              executionContext
            );

            // 3. Interceptors & Handler
            const baseHandler: CallHandler = {
              handle: async () => handlerInstance(...args), // Ejecutamos sobre la instancia
            };

            const executionChain = await this.composeInterceptors(
              resolvedInterceptors,
              baseHandler,
              executionContext
            );

            return await executionChain.handle();
          } catch (error: any) {
            return this.handleException(error, ctx, resolvedFilters, method);
          }
        })();

        return app.trackRequest(requestPromise);
      });

      // Logging
      const methodColor = this.getMethodColor(httpMethod);
      const coloredMethod = pc.bold(methodColor(httpMethod.padEnd(7)));
      const routeInfo = fullPath.padEnd(26);
      const separator = pc.dim("::");
      const controllerInfo = pc.cyan(ControllerClass.name);

      this.logger.log(
        `${coloredMethod} ${routeInfo} ${separator} ${controllerInfo}`
      );
    }
  }

  // ... (handleException, composeInterceptors y getMethodColor siguen igual) ...

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
          null as any,
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
      if (!currentInterceptor) continue; // Safety check

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
