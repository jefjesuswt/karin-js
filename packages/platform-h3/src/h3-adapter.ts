import { Logger, type IHttpAdapter, BadRequestException } from "@karin-js/core";
import {
  H3,
  handleCors,
  readBody,
  getQuery,
  getRouterParams,
  type H3Event,
  setResponseStatus,
} from "h3";

export class H3Adapter implements IHttpAdapter<H3Event> {
  private app: H3;
  private logger = new Logger("H3Adapter");
  private middlewares: Function[] = [];
  private server: any;

  constructor() {
    this.app = new H3();
  }

  public get fetch() {
    return this.app.fetch;
  }

  get(path: string, handler: (ctx: H3Event) => void) {
    this.app.get(path, handler);
  }

  post(path: string, handler: (ctx: H3Event) => void) {
    this.app.post(path, handler);
  }

  put(path: string, handler: (ctx: H3Event) => void) {
    this.app.put(path, handler);
  }

  patch(path: string, handler: (ctx: H3Event) => void) {
    this.app.patch(path, handler);
  }

  delete(path: string, handler: (ctx: H3Event) => void) {
    this.app.delete(path, handler);
  }

  use(middleware: Function) {
    this.middlewares.push(middleware);
    this.app.use((event) => middleware(event));
  }

  enableCors() {
    this.app.use((event) => {
      const handled = handleCors(event, {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        preflight: { statusCode: 204 },
      });

      if (handled) {
        event.res.status = 204;
        return null;
      }
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
    if (!ctx.req || !ctx.req.headers) return {};
    const headers: Record<string, any> = {};

    if (ctx.req.headers instanceof Headers) {
      ctx.req.headers.forEach((v, k) => (headers[k] = v));
    } else {
      Object.assign(headers, ctx.req.headers);
    }
    return headers;
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
    const fetchHandler = this.app.fetch.bind(this.app);

    this.server = Bun.serve({
      port,
      hostname: host,
      fetch: fetchHandler,
    });

    return this.server;
  }

  close() {
    if (this.server && typeof this.server.stop === "function") {
      this.server.stop();
      this.logger.log("H3 Server stopped");
    }
  }
}
