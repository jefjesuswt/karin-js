import type { Type } from ".";

export interface ArgumentsHost {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
  getNext<T = any>(): T;
  switchToHttp(): HttpArgumentsHost;
}

export interface HttpArgumentsHost extends ArgumentsHost {}

export interface ExecutionContext extends ArgumentsHost {
  getClass<T = any>(): Type<T>;
  getHandler(): Function;
  switchToHttp(): HttpArgumentsHost;
}
