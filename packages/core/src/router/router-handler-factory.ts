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
    return this.createNormalHandler(app, ControllerClass, methodName, compiled);
  }

  /**
   * ✅ OPTIMIZADO: Handler ultra-rápido sin middleware
   */
  private createFastHandler(
    app: KarinApplication,
    compiled: CompiledRouteMetadata
  ) {
    const { boundHandler } = compiled;

    return async (ctx: any) => {
      const requestPromise = (async () => {
        try {
          // ✅ Ejecuta directo sin guards/pipes/interceptors
          return await boundHandler();
        } catch (error: any) {
          // Manejo básico de errores sin ExecutionContext completo
          return this.defaultFilter.catch(error, this.createBasicHost(ctx));
        }
      })();

      return app.trackRequest(requestPromise);
    };
  }

  /**
   * ✅ CORREGIDO: Usa metadata pre-compilado
   */
  private createNormalHandler(
    app: KarinApplication,
    ControllerClass: Type<any>,
    methodName: string,
    compiled: CompiledRouteMetadata
  ) {
    // ✅ TODO pre-resuelto desde MetadataCache
    const { boundHandler, guards, pipes, interceptors, filters, params } = compiled;

    return async (ctx: any) => {
      const requestPromise = (async () => {
        try {
          const executionContext = new KarinExecutionContext(
            this.adapter,
            ctx,
            ControllerClass,
            boundHandler
          );

          // 1. Guards (ya instanciados)
          for (const guard of guards) {
            const canActivate = await guard.canActivate(executionContext);
            if (!canActivate) {
              throw new ForbiddenException("Forbidden resource");
            }
          }

          // 2. Params & Pipes (ya instanciados)
          const args = await this.paramsResolver.resolve(
            ctx,
            params,
            pipes,
            this.adapter,
            executionContext
          );

          // 3. Interceptors & Handler
          if (interceptors.length === 0) {
            // ✅ OPTIMIZACIÓN: Bypass si no hay interceptors
            return await boundHandler(...args);
          }

          const baseHandler: CallHandler = {
            handle: async () => boundHandler(...args),
          };

          const executionChain = await this.composeInterceptors(
            interceptors,
            baseHandler,
            executionContext
          );

          return await executionChain.handle();
        } catch (error: any) {
          return this.handleException(
            error,
            ctx,
            filters,
            ControllerClass.prototype[methodName]
          );
        }
      })();

      return app.trackRequest(requestPromise);
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