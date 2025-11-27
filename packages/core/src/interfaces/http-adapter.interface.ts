export interface IHttpAdapter<
  TContext = any,
  TRequest = Request,
  TResponse = any
> {
  // Métodos de enrutamiento
  get(path: string, handler: (ctx: TContext) => void): void;
  post(path: string, handler: (ctx: TContext) => void): void;
  put(path: string, handler: (ctx: TContext) => void): void;
  delete(path: string, handler: (ctx: TContext) => void): void;
  patch(path: string, handler: (ctx: TContext) => void): void;
  listen(port: number, host?: string): void;

  enableCors?(options?: any): void;

  listen(port: number, host?: string): any;
  close?(): void | Promise<void>;

  readBody(ctx: TContext): Promise<any>;
  getQuery(ctx: TContext): Record<string, any>;
  getParams(ctx: TContext): Record<string, any>;
  getHeaders(ctx: TContext): Record<string, any>;

  getRequest(ctx: TContext): TRequest;
  getResponse(ctx: TContext): TResponse;

  setHeader(ctx: TContext, key: string, value: string): void;
}
