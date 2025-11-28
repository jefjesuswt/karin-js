import { Logger, type IHttpAdapter } from "@karin-js/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

export class HonoAdapter implements IHttpAdapter<Context, Request, Context> {
  private app: Hono;
  private server: any;
  private logger = new Logger("HonoAdapter");

  constructor() {
    this.app = new Hono();
  }

  public get fetch() {
    return this.app.fetch;
  }

  private normalizeResponse(handler: (ctx: Context) => any) {
    return async (c: Context) => {
      const result = await handler(c);

      if (result instanceof Response) return result;

      if (result === null || result === undefined) {
        return c.body(null, 204);
      }

      if (typeof result === "object") {
        return c.json(result);
      }

      return c.text(String(result));
    };
  }

  get(path: string, handler: (ctx: Context) => void) {
    this.app.get(path, this.normalizeResponse(handler));
  }

  post(path: string, handler: (ctx: Context) => void) {
    this.app.post(path, this.normalizeResponse(handler));
  }

  put(path: string, handler: (ctx: Context) => void) {
    this.app.put(path, this.normalizeResponse(handler));
  }

  patch(path: string, handler: (ctx: Context) => void) {
    this.app.patch(path, this.normalizeResponse(handler));
  }

  delete(path: string, handler: (ctx: Context) => void) {
    this.app.delete(path, this.normalizeResponse(handler));
  }

  listen(port: number, host?: string) {
    this.server = Bun.serve({
      port,
      hostname: host,
      fetch: this.app.fetch,
    });

    return this.server;
  }

  close() {
    if (this.server && typeof this.server.stop === "function") {
      this.server.stop();
      this.logger.log("Hono Server stopped");
    }
  }

  enableCors(options?: any) {
    this.app.use("*", cors(options));
  }

  async readBody(c: Context) {
    const contentType = c.req.header("Content-Type") || "";

    // 🔥 FIX: Parseo manual seguro para evitar que Hono lance excepciones 500
    // cuando el JSON está mal formado.
    if (contentType.includes("application/json")) {
      try {
        const text = await c.req.text();
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    }

    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      return c.req.parseBody();
    }

    if (contentType.includes("text/plain")) {
      return c.req.text();
    }

    // Fallback
    try {
      const text = await c.req.text();
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  getQuery(c: Context) {
    return c.req.query();
  }

  getParams(c: Context) {
    return c.req.param();
  }

  getHeaders(c: Context) {
    return c.req.header();
  }

  getRequest(c: Context): Request {
    return c.req.raw;
  }

  getResponse(c: Context): Context {
    return c;
  }

  setHeader(c: Context, key: string, value: string) {
    c.header(key, value);
  }
}
