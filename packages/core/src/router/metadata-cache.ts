import { Logger } from "../logger";
import type { RouteParamMetadata } from "../decorators/params";
import type {
  CanActivate,
  PipeTransform,
  KarinInterceptor,
  ExceptionFilter,
  Type,
} from "../interfaces";
import { isConstructor } from "../utils/type-guards";
import { DICache } from "./di-cache";
import { FILTER_CATCH_EXCEPTIONS } from "../decorators/constants";

export interface ResolvedFilter {
  instance: ExceptionFilter;
  catchMetatypes: any[];
}

export interface CompiledRouteMetadata {
  controllerInstance: any;
  boundHandler: Function;
  guards: CanActivate[];
  pipes: PipeTransform[];
  interceptors: KarinInterceptor[];
  filters: ResolvedFilter[]; // ✅ Ya incluye metadata pre-procesado
  params: ResolvedParamMetadata[];
  isFast: boolean;
}

export interface ResolvedParamMetadata extends RouteParamMetadata {
  resolvedPipes: PipeTransform[];
}

export class MetadataCache {
  private static cache = new Map<string, CompiledRouteMetadata>();
  private static logger = new Logger("MetadataCache");

  static compile(
    controllerClass: Type<any>,
    methodName: string,
    rawMetadata: {
      guards: any[];
      pipes: any[];
      interceptors: any[];
      filters: any[];
      params: RouteParamMetadata[];
      isFast: boolean;
    }
  ): CompiledRouteMetadata {
    const cacheKey = `${controllerClass.name}.${methodName}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // ✅ 1. Pre-resolve controller (Singleton)
    const controllerInstance = DICache.resolve(controllerClass);
    const boundHandler = controllerInstance[methodName].bind(controllerInstance);

    // ✅ 2. Pre-resolve guards, pipes, interceptors
    const guards = this.resolveInstances<CanActivate>(rawMetadata.guards);
    const pipes = this.resolveInstances<PipeTransform>(rawMetadata.pipes);
    const interceptors = this.resolveInstances<KarinInterceptor>(rawMetadata.interceptors);

    // ✅ 3. OPTIMIZACIÓN: Pre-resolve filters CON metadata
    const filterInstances = this.resolveInstances<ExceptionFilter>(rawMetadata.filters);
    const filters: ResolvedFilter[] = filterInstances.map((instance) => {
      const constructor = Object.getPrototypeOf(instance).constructor;
      const catchMetatypes =
        Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, constructor) || [];
      return { instance, catchMetatypes };
    });

    // ✅ 4. OPTIMIZACIÓN: Pre-ordenar filters UNA VEZ
    this.sortFilters(filters);

    // ✅ 5. Pre-resolve pipes de parámetros
    const params: ResolvedParamMetadata[] = rawMetadata.params.map((param) => ({
      ...param,
      resolvedPipes: this.resolveInstances<PipeTransform>(param.pipes || []),
    }));

    const compiled: CompiledRouteMetadata = {
      controllerInstance,
      boundHandler,
      guards,
      pipes,
      interceptors,
      filters, // ✅ Ya ordenados y con metadata
      params,
      isFast: rawMetadata.isFast,
    };

    this.cache.set(cacheKey, compiled);

    if (process.env.DEBUG) {
      this.logger.debug(`Compiled metadata for ${cacheKey}`);
    }

    return compiled;
  }

  /**
   * ✅ OPTIMIZACIÓN: Sort filters solo una vez en compile
   */
  private static sortFilters(filters: ResolvedFilter[]) {
    filters.sort((a, b) => {
      const isCatchAllA = a.catchMetatypes.length === 0;
      const isCatchAllB = b.catchMetatypes.length === 0;
      if (isCatchAllA && !isCatchAllB) return 1;
      if (!isCatchAllA && isCatchAllB) return -1;
      return 0;
    });
  }

  private static resolveInstances<T>(items: any[]): T[] {
    return items.map((item) =>
      isConstructor(item) ? DICache.resolve(item) : item
    );
  }

  static get(
    controllerClass: Type<any>,
    methodName: string
  ): CompiledRouteMetadata {
    const cacheKey = `${controllerClass.name}.${methodName}`;
    const compiled = this.cache.get(cacheKey);

    if (!compiled) {
      throw new Error(
        `No compiled metadata found for ${cacheKey}. Did you call MetadataCache.compile()?`
      );
    }

    return compiled;
  }

  static getStats() {
    return {
      size: this.cache.size,
      routes: Array.from(this.cache.keys()),
    };
  }

  static clear() {
    this.cache.clear();
  }
}