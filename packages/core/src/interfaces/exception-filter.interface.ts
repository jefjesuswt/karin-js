import type { ArgumentsHost } from ".";

export interface ExceptionFilter<T = any> {
  catch(exception: T, host: ArgumentsHost): any | Promise<any>;
}
