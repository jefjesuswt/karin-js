// 👇 Agregamos BadRequestException
import { Logger, type IHttpAdapter, BadRequestException } from "@karin-js/core";
import {
  H3,
  handleCors,
  readBody,
  getQuery,
  getRouterParams,
  getRequestHeaders,
  type H3Event,
  setResponseHeader,
} from "h3";

export class H3Adapter implements IHttpAdapter<H3Event> {
  private app: H3;
  private logger = new Logger("H3Adapter");
  private middlewares: Function[] = [];

  constructor() {
    this.app = new H3();
  }

  get(path: string, handler: (ctx: H3Event) => void) {
    this.app.get(path, (event) => handler(event));
  }

  post(path: string, handler: (ctx: H3Event) => void) {
    this.app.post(path, (event) => handler(event));
  }

  put(path: string, handler: (ctx: H3Event) => void) {
    this.app.put(path, (event) => handler(event));
  }

  patch(path: string, handler: (ctx: H3Event) => void) {
    this.app.patch(path, (event) => handler(event));
  }

  delete(path: string, handler: (ctx: H3Event) => void) {
    this.app.delete(path, (event) => handler(event));
  }

  use(middleware: Function) {
    this.middlewares.push(middleware);
    this.app.use((event) => middleware(event));
  }

  enableCors() {
    this.app.use((event) => {
      return handleCors(event, {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        preflight: { statusCode: 204 },
      });
    });
  }

  async readBody(ctx: H3Event) {
    try {
      return await readBody(ctx);
    } catch (error) {
      throw new BadRequestException("Invalid JSON body format");
    }
  }

  getQuery(ctx: H3Event) {
    return getQuery(ctx);
  }

  getParams(ctx: H3Event) {
    return getRouterParams(ctx);
  }

  getHeaders(ctx: H3Event) {
    // Conversión segura de headers
    return Object.fromEntries(ctx.req.headers.entries());
  }

  getRequest(ctx: H3Event) {
    return ctx.req;
  }

  getResponse(ctx: H3Event) {
    return ctx.res;
  }

  setHeader(ctx: H3Event, key: string, value: string) {
    ctx.res.headers.set(key, value);
  }

  listen(port: number, host?: string) {
    const h3App = this.app;

    Bun.serve({
      port,
      hostname: host,
      async fetch(req) {
        return h3App.fetch(req);
      },
    });
  }
}
