import { container } from "tsyringe";
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
  controllerInstance: Type<any>;
  boundHandler: Function;
  guards: CanActivate[];
  pipes: PipeTransform[];
  interceptors: KarinInterceptor[];
  filters: ResolvedFilter[];
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

    const controllerInstance = DICache.resolve(controllerClass);
    const boundHandler =
      controllerInstance[methodName].bind(controllerInstance);

    const guards = this.resolveInstances<CanActivate>(rawMetadata.guards);
    const pipes = this.resolveInstances<PipeTransform>(rawMetadata.pipes);
    const interceptors = this.resolveInstances<KarinInterceptor>(
      rawMetadata.interceptors
    );

    // Resolve filters and their metadata
    const filterInstances = this.resolveInstances<ExceptionFilter>(
      rawMetadata.filters
    );
    const filters: ResolvedFilter[] = filterInstances.map((instance) => {
      const constructor = Object.getPrototypeOf(instance).constructor;
      const catchMetatypes =
        Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, constructor) || [];
      return { instance, catchMetatypes };
    });

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
      filters,
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
   * Resuelve instancias desde constructores o instancias ya creadas
   */
  private static resolveInstances<T>(items: any[]): T[] {
    return items.map((item) =>
      isConstructor(item) ? DICache.resolve(item) : item
    );
  }

  /**
   * Obtiene metadata compilado (falla si no existe)
   */
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
