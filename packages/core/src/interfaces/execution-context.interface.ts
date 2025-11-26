import type { Type } from ".";

export interface HttpArgumentsHost {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
  getNext<T = any>(): T;
}

export interface ExecutionContext {
  getClass<T = any>(): Type<T>;
  getHandler(): Function;
  switchToHttp(): HttpArgumentsHost;
}
