export interface ArgumentMetadata {
  type: "body" | "query" | "param" | "custom";
  metatype?: any;
  data?: string;
}

export interface PipeTransform<T = any, R = any> {
  transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}

export interface CanActivate {
  canActivate(context: any): boolean | Promise<boolean>;
}

export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

export * from "./http-adapter.interface";
export * from "./execution-context.interface";
export * from "./exception-filter.interface";
export * from "./plugin.interface";
export * from "./interceptor.interface";
