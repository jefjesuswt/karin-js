import "reflect-metadata";
import { container } from "tsyringe";
import { Logger } from "../logger";
import { KarinApplication } from "../karin.application";
import { MetadataScanner, type RouteDefinition } from "./metadata-scanner";
import {
  isConstructor,
  isExceptionFilter,
  isInterceptor,
} from "../utils/type-guards";
import type {
  IHttpAdapter,
  PipeTransform,
  CanActivate,
  KarinInterceptor,
  ExceptionFilter,
} from "../interfaces";
import { FILTER_CATCH_EXCEPTIONS } from "../decorators/constants";
import pc from "picocolors";
import { RouteHandlerFactory } from "./router-handler-factory";

export class RouterExplorer {
  private logger = new Logger("RouterExplorer");
  private scanner = new MetadataScanner();
  private handlerFactory: RouteHandlerFactory;

  constructor(private readonly adapter: IHttpAdapter) {
    this.handlerFactory = new RouteHandlerFactory(adapter);
  }

  public explore(app: KarinApplication, ControllerClass: any) {
    if (!container.isRegistered(ControllerClass)) {
      container.registerSingleton(ControllerClass);
    }

    // 2. Registro en App (Para OpenAPI)
    app.registerController(ControllerClass);

    // 3. Escaneo de rutas (Pura metadata)
    const routes = this.scanner.scan(ControllerClass);

    for (const route of routes) {
      this.registerRoute(app, ControllerClass, route);
    }
  }

  private registerRoute(
    app: KarinApplication,
    ControllerClass: any,
    route: RouteDefinition
  ) {
    const { httpMethod, fullPath, methodName } = route;
    const adapterMethod = (this.adapter as any)[httpMethod.toLowerCase()];

    if (adapterMethod) {
      const deps = this.resolveDependencies(app, route);

      const handler = this.handlerFactory.create(
        app,
        ControllerClass,
        methodName,
        { ...deps, params: route.params }
      );

      adapterMethod.call(this.adapter, fullPath, handler);

      this.logRoute(httpMethod, fullPath, ControllerClass.name);
    }
  }

  private resolveDependencies(app: KarinApplication, route: RouteDefinition) {
    const resolve = (items: any[]) =>
      items.map((item) =>
        isConstructor(item) ? container.resolve(item) : item
      );

    const guards = resolve([
      ...app.getGlobalGuards(),
      ...route.guards,
    ]) as CanActivate[];

    const pipes = resolve([
      ...app.getGlobalPipes(),
      ...route.pipes,
    ]) as PipeTransform[];

    const interceptors = resolve(route.interceptors).filter((i) =>
      isInterceptor(i)
    ) as KarinInterceptor[];

    const filters = resolve([
      ...route.filters,
      ...app.getGlobalFilters(),
    ]).filter((f) => isExceptionFilter(f)) as ExceptionFilter[];

    this.sortFilters(filters);

    return { guards, pipes, interceptors, filters };
  }

  private sortFilters(filters: ExceptionFilter[]) {
    filters.sort((a, b) => {
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
  }

  private logRoute(method: string, path: string, controllerName: string) {
    const methodColor = this.getMethodColor(method);
    const coloredMethod = pc.bold(methodColor(method.padEnd(7)));
    const routeInfo = path.padEnd(4);
    const separator = pc.dim("::");
    const controllerInfo = pc.cyan(controllerName);
    this.logger.log(
      `${coloredMethod} ${routeInfo} ${separator} ${controllerInfo}`
    );
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
