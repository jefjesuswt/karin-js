import type { ExecutionContext } from "./execution-context.interface";

export interface CallHandler<T = any> {
  handle(): Promise<T>;
}

export interface KarinInterceptor<T = any, R = any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R> | R;
}
