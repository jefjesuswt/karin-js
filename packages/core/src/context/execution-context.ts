import type {
  ExecutionContext,
  HttpArgumentsHost,
  IHttpAdapter,
  Type,
} from "../interfaces";

export class KarinExecutionContext implements ExecutionContext {
  constructor(
    private readonly adapter: IHttpAdapter,
    private readonly platformContext: any,
    private readonly controllerClass: Type<any>,
    private readonly handler: Function
  ) {}

  getClass<T = any>(): Type<T> {
    return this.controllerClass;
  }

  getHandler(): Function {
    return this.handler;
  }

  switchToHttp(): HttpArgumentsHost {
    return {
      getRequest: <T = any>() =>
        this.adapter.getRequest(this.platformContext) as T,
      getResponse: <T = any>() =>
        this.adapter.getResponse(this.platformContext) as T,
      getNext: <T = any>() => null as T,
    };
  }
}
