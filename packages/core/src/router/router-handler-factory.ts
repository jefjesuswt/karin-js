import { container } from "tsyringe";
import { KarinExecutionContext } from "../context/execution-context";
import { ForbiddenException } from "../exceptions/http.exception";
import { BaseExceptionFilter } from "../exceptions/base-exception.filter";
import type {
  IHttpAdapter,
  CallHandler,
  KarinInterceptor,
  ExceptionFilter,
  Type,
  CanActivate,
  PipeTransform,
} from "../interfaces";
import type { ResolvedParamMetadata, ResolvedFilter } from "./metadata-cache";
import { ParamsResolver } from "./param-resolver";
import { KarinApplication } from "../karin.application";

export interface HandlerDependencies {
  guards: CanActivate[];
  pipes: PipeTransform[];
  interceptors: KarinInterceptor[];
  filters: ResolvedFilter[];
  params: ResolvedParamMetadata[];
}

export class RouteHandlerFactory {
  private paramsResolver = new ParamsResolver();
  private defaultFilter = new BaseExceptionFilter();

  constructor(private readonly adapter: IHttpAdapter) { }

  public create(
    app: KarinApplication,
    ControllerClass: Type<any>,
    methodName: string,
    deps: HandlerDependencies
  ) {
    return async (ctx: any) => {
      // Graceful shutdown tracking
      const requestPromise = (async () => {
        try {
          // 1. Lazy Instantiation del Controlador
          const controllerInstance = container.resolve(ControllerClass);
          const handlerInstance =
            controllerInstance[methodName].bind(controllerInstance);

          const executionContext = new KarinExecutionContext(
            this.adapter,
            ctx,
            ControllerClass,
            handlerInstance
          );

          // 2. Guards
          for (const guard of deps.guards) {
            const canActivate = await guard.canActivate(executionContext);
            if (!canActivate) {
              throw new ForbiddenException("Forbidden resource");
            }
          }

          // 3. Pipes & Argument Resolution
          const args = await this.paramsResolver.resolve(
            ctx,
            deps.params,
            deps.pipes,
            this.adapter,
            executionContext
          );

          // 4. Interceptors & Handler Execution
          if (deps.interceptors.length === 0) {
            return await handlerInstance(...args);
          }

          const baseHandler: CallHandler = {
            handle: async () => handlerInstance(...args),
          };

          const executionChain = await this.composeInterceptors(
            deps.interceptors,
            baseHandler,
            executionContext
          );

          return await executionChain.handle();
        } catch (error: any) {
          return this.handleException(
            error,
            ctx,
            deps.filters,
            ControllerClass.prototype[methodName]
          );
        }
      })();

      return app.trackRequest(requestPromise);
    };
  }

  private async handleException(
    exception: any,
    ctx: any,
    resolvedFilters: ResolvedFilter[],
    method: Function
  ) {
    for (const filter of resolvedFilters) {
      const handlesException =
        filter.catchMetatypes.length === 0 ||
        filter.catchMetatypes.some((meta: any) => exception instanceof meta);

      if (handlesException) {
        const host = new KarinExecutionContext(
          this.adapter,
          ctx,
          null as any,
          method
        ).switchToHttp();

        return filter.instance.catch(exception, host);
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
}
