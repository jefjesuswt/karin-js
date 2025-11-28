import "reflect-metadata";
import {
  CONTROLLER_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  PARAMS_METADATA,
  GUARDS_METADATA,
  PIPES_METADATA,
  FILTER_METADATA,
  INTERCEPTORS_METADATA,
} from "../decorators/constants";
import type { RouteParamMetadata } from "../decorators/params";
import type {
  CanActivate,
  PipeTransform,
  ExceptionFilter,
  KarinInterceptor,
} from "../interfaces";

export interface RouteDefinition {
  methodName: string;
  httpMethod: string;
  path: string;
  fullPath: string;
  guards: CanActivate[];
  pipes: PipeTransform[];
  interceptors: KarinInterceptor[];
  filters: ExceptionFilter[];
  params: RouteParamMetadata[];
}

export class MetadataScanner {
  public scan(ControllerClass: any): RouteDefinition[] {
    const proto = ControllerClass.prototype;
    const prefix = Reflect.getMetadata(
      CONTROLLER_METADATA,
      ControllerClass
    ) as string;

    // Metadatos de clase (Globales para el controlador)
    const classGuards =
      Reflect.getMetadata(GUARDS_METADATA, ControllerClass) || [];
    const classPipes =
      Reflect.getMetadata(PIPES_METADATA, ControllerClass) || [];
    const classInterceptors =
      Reflect.getMetadata(INTERCEPTORS_METADATA, ControllerClass) || [];
    const classFilters =
      Reflect.getMetadata(FILTER_METADATA, ControllerClass) || [];

    const routes: RouteDefinition[] = [];
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (m) => m !== "constructor"
    );

    for (const methodName of methodNames) {
      const method = proto[methodName];
      if (
        typeof method !== "function" ||
        !Reflect.hasMetadata(METHOD_METADATA, method)
      ) {
        continue;
      }

      const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);
      const routePath = Reflect.getMetadata(PATH_METADATA, method);

      let fullPath = `/${prefix}/${routePath}`.replace(/\/+/g, "/");
      if (fullPath.length > 1 && fullPath.endsWith("/"))
        fullPath = fullPath.slice(0, -1);

      const methodGuards = Reflect.getMetadata(GUARDS_METADATA, method) || [];
      const methodPipes = Reflect.getMetadata(PIPES_METADATA, method) || [];
      const methodInterceptors =
        Reflect.getMetadata(INTERCEPTORS_METADATA, method) || [];
      const methodFilters = Reflect.getMetadata(FILTER_METADATA, method) || [];
      const params =
        Reflect.getMetadata(PARAMS_METADATA, proto, methodName) || [];

      routes.push({
        methodName,
        httpMethod,
        path: routePath,
        fullPath,
        guards: [...classGuards, ...methodGuards],
        pipes: [...classPipes, ...methodPipes],
        interceptors: [...classInterceptors, ...methodInterceptors],
        filters: [...classFilters, ...methodFilters],
        params,
      });
    }

    return routes;
  }
}
