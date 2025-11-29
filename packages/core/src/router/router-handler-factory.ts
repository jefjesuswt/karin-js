import { KarinExecutionContext } from "../context/execution-context";
import { ForbiddenException } from "../exceptions/http.exception";
import { BaseExceptionFilter } from "../exceptions/base-exception.filter";
import type {
  IHttpAdapter,
  CallHandler,
  Type,
} from "../interfaces";
import { ParamsResolver } from "./param-resolver";
import { KarinApplication } from "../karin.application";
import type { CompiledRouteMetadata } from "./metadata-cache";

export class RouteHandlerFactory {
  private paramsResolver = new ParamsResolver();
  private defaultFilter = new BaseExceptionFilter();

  constructor(private readonly adapter: IHttpAdapter) { }

  /**
   * ✅ CORREGIDO: Usa metadata pre-compilado sin DI en runtime
   */
  public create(
    app: KarinApplication,
    ControllerClass: Type<any>,
    methodName: string,
    compiled: CompiledRouteMetadata
  ) {
    // ✅ FAST PATH: Bypass total para rutas @Fast()
    if (compiled.isFast) {
      return this.createFastHandler(app, compiled);
    }

    // Path normal optimizado
    return this.createOptimizedHandler(app, ControllerClass, methodName, compiled);
  }


  private createFastHandler(
    app: KarinApplication,
    compiled: CompiledRouteMetadata
  ) {
    const { boundHandler } = compiled;

    // ⚡ ULTRA FAST PATH:
    // 1. Retornamos la función boundHandler DIRECTAMENTE.
    // 2. Eliminamos el wrapper (ctx) => ... si es posible.
    // 3. Eliminamos try/catch.
    // 4. Eliminamos app.trackRequest (ahorramos allocación de promesas y Set).

    // Si tu boundHandler no espera argumentos (ej: un "hello world" estático),
    // podemos envolverlo en una arrow function mínima para descartar el argumento 'ctx'
    // que envía el adaptador, evitando que boundHandler reciba basura.
    return () => boundHandler();
  }

  /**
   * ✅ CORREGIDO: Usa metadata pre-compilado
   */
  /**
   * ✅ ULTRA-OPTIMIZADO: Path crítico sin overhead
   */
  private createOptimizedHandler(
    app: KarinApplication,
    ControllerClass: Type<any>,
    methodName: string,
    compiled: CompiledRouteMetadata
  ) {
    const { boundHandler, guards, pipes, interceptors, filters, params } = compiled;

    // ✅ Pre-computa flags para evitar checks en runtime
    const hasGuards = guards.length > 0;
    const hasPipes = pipes.length > 0;
    const hasParams = params.length > 0;
    const hasInterceptors = interceptors.length > 0;
    const hasFilters = filters.length > 0;

    // ✅ OPTIMIZACIÓN: Si no hay nada, usa path ultra-rápido
    if (!hasGuards && !hasPipes && !hasParams && !hasInterceptors) {
      return async (ctx: any) => {
        try {
          return await boundHandler();
        } catch (error: any) {
          if (!hasFilters) {
            return this.defaultFilter.catch(error, this.createBasicHost(ctx));
          }
          return this.handleException(error, ctx, filters, ControllerClass.prototype[methodName]);
        }
      };
    }

    // Path normal optimizado
    return async (ctx: any) => {
      try {
        let executionContext: KarinExecutionContext | undefined;

        // ✅ OPTIMIZACIÓN: Solo crea context si es necesario
        if (hasGuards || hasParams || hasInterceptors) {
          executionContext = new KarinExecutionContext(
            this.adapter,
            ctx,
            ControllerClass,
            boundHandler
          );
        }

        // Guards
        if (hasGuards) {
          for (const guard of guards) {
            const canActivate = await guard.canActivate(executionContext!);
            if (!canActivate) {
              throw new ForbiddenException("Forbidden resource");
            }
          }
        }

        // Params
        let args: unknown[] = [];
        if (hasParams) {
          args = await this.paramsResolver.resolve(
            ctx,
            params,
            pipes,
            this.adapter,
            executionContext!
          );
        }

        // Interceptors
        if (hasInterceptors) {
          // executionContext is guaranteed to be created above

          const baseHandler: CallHandler = {
            handle: async () => boundHandler(...args),
          };

          const executionChain = await this.composeInterceptors(
            interceptors,
            baseHandler,
            executionContext!
          );

          return await executionChain.handle();
        }

        // Handler directo
        return await boundHandler(...args);
      } catch (error: any) {
        if (!hasFilters) {
          return this.defaultFilter.catch(error, this.createBasicHost(ctx));
        }
        return this.handleException(
          error,
          ctx,
          filters,
          ControllerClass.prototype[methodName]
        );
      }
    };
  }

  /**
   * ✅ OPTIMIZADO: Usa filters pre-ordenados
   */
  private async handleException(
    exception: any,
    ctx: any,
    resolvedFilters: any[], // Ya pre-ordenados y con metadata
    method: Function
  ) {
    // ✅ Los filters ya vienen con su metadata desde MetadataCache
    for (const filterData of resolvedFilters) {
      const { instance, catchMetatypes } = filterData;

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

        return instance.catch(exception, host);
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
    interceptors: any[],
    handler: CallHandler,
    context: KarinExecutionContext
  ): Promise<CallHandler> {
    let next = handler;

    for (let i = interceptors.length - 1; i >= 0; i--) {
      const currentInterceptor = interceptors[i];
      if (!currentInterceptor) continue;

      const currentNext = next;

      next = {
        handle: async () => {
          return currentInterceptor.intercept(context, currentNext);
        },
      };
    }
    return next;
  }

  /**
   * ✅ Host simplificado para fast path
   */
  private createBasicHost(ctx: any) {
    return {
      switchToHttp: () => ({
        getRequest: () => this.adapter.getRequest(ctx),
        getResponse: () => this.adapter.getResponse(ctx),
      }),
    } as any;
  }
}