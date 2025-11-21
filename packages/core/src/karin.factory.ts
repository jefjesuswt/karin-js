import "reflect-metadata";
import { container } from "tsyringe";
import { Glob } from "bun";
import { join } from "path";
import {
    CONTROLLER_METADATA,
    METHOD_METADATA,
    PATH_METADATA,
    PARAMS_METADATA
} from "./decorators/constants";
import type { RouteParamMetadata } from "./decorators/params";
import { Logger } from "./logger";
import { isObject, isConstructor } from "./utils/type-guards";
import { readBody, getQuery, getRouterParams } from "h3";

export interface IHttpAdapter {
  get(path: string, handler: Function): void;
  post(path: string, handler: Function): void;
  listen(port: number): void;
}

export class KarinFactory {
  private static logger = new Logger('KarinFactory');

  static async create(adapter: IHttpAdapter, options: { scan?: string } = {}) {
    const scanPath = options.scan || './src/**/*.controller.ts';
    const glob = new Glob(scanPath);
    const cwd = process.cwd();

    this.logger.info(`Scanning controllers in: ${scanPath}`);

    for await (const file of glob.scan(cwd)) {
      const absolutePath = join(cwd, file);
      const module = await import(absolutePath);

      for (const key in module) {
        const CandidateClass = module[key];

        if (isConstructor(CandidateClass) && Reflect.hasMetadata(CONTROLLER_METADATA, CandidateClass)) {
          KarinFactory.registerController(adapter, CandidateClass);
        }
      }
    }

    return adapter;
  }

  private static registerController(adapter: IHttpAdapter, ControllerClass: new (...args: unknown[]) => unknown) {
    const controllerInstance: object = container.resolve(ControllerClass) as object;

    const prefix = Reflect.getMetadata(CONTROLLER_METADATA, ControllerClass) as string;

    const proto = Object.getPrototypeOf(controllerInstance) as object;
    const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor');

    for (const methodName of methods) {
      const method = (controllerInstance as Record<string, unknown>)[methodName];

      if (typeof method !== 'function') continue;

      if (Reflect.hasMetadata(METHOD_METADATA, method)) {
        const httpMethod = Reflect.getMetadata(METHOD_METADATA, method) as string;
        const routePath = Reflect.getMetadata(PATH_METADATA, method) as string;
        const fullPath = `/${prefix}/${routePath}`.replace(/\/+/g, '/');

        const paramsMeta: RouteParamMetadata[] = Reflect.getMetadata(
            PARAMS_METADATA,
            controllerInstance,
            methodName
        ) || [];

        const adapterMethod = (adapter as unknown as Record<string, Function>)[httpMethod.toLowerCase()];

        if (adapterMethod) {
            adapterMethod.call(adapter, fullPath, async (event: unknown) => {
                const args = await KarinFactory.resolveArgs(event, paramsMeta);
                return method.apply(controllerInstance, args);
            });

            this.logger.log(`Mapped {${fullPath}, ${httpMethod}} route`);
        }
      }
    }
  }

  private static async resolveArgs(event: any, params: RouteParamMetadata[]): Promise<unknown[]> {
    const args: unknown[] = [];
    params.sort((a, b) => a.index - b.index);

    for (const param of params) {
      let value: unknown = undefined;
      switch (param.type) {
        case 'BODY':
          value = await readBody(event);
          break;
        case 'QUERY':
          value = getQuery(event);
          break;
        case 'PARAM':
          value = getRouterParams(event);
          break;
        case 'HEADERS':
          value = Object.fromEntries(event.req.headers.entries());
          break;
        case 'REQ':
          value = event.node.req;
          break;
        case 'RES':
          value = event.node.res;
          break;
      }

      if (param.data) {
        if (isObject(value)) {
            args[param.index] = value[param.data];
        } else {
            args[param.index] = undefined;
        }
      } else {
        args[param.index] = value;
      }
    }
    return args;
  }
}
