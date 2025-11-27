import { Logger, type IHttpAdapter } from "@karin-js/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

export class HonoAdapter implements IHttpAdapter<Context, Request, Context> {
  private app: Hono;
  private logger = new Logger("HonoAdapter");

  constructor() {
    this.app = new Hono();
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

  // --- Server Start ---

  listen(port: number, host?: string) {
    return Bun.serve({
      port,
      hostname: host,
      fetch: this.app.fetch,
    });
  }

  // --- Configuración ---

  enableCors(options?: any) {
    this.app.use("*", cors(options));
  }

  // --- Abstracciones (El puente con Karin Core) ---

  async readBody(c: Context) {
    const contentType = c.req.header("Content-Type") || "";

    // Detección inteligente del tipo de cuerpo
    if (contentType.includes("application/json")) {
      return c.req.json();
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

    // Fallback a JSON o intentar parsear si no hay header explícito pero tiene contenido
    try {
      return await c.req.json();
    } catch {
      return undefined;
    }
  }

  getQuery(c: Context) {
    return c.req.query(); // Retorna Record<string, string>
  }

  getParams(c: Context) {
    return c.req.param(); // Retorna Record<string, string>
  }

  getHeaders(c: Context) {
    return c.req.header(); // Retorna Record<string, string>
  }

  getRequest(c: Context): Request {
    // Hono expone el Request estándar en .raw
    return c.req.raw;
  }

  getResponse(c: Context): Context {
    // En Hono, la respuesta se construye al final, pero usamos el contexto
    // para configurar headers intermedios si es necesario (ej. c.header())
    return c;
  }

  setHeader(c: Context, key: string, value: string) {
    c.header(key, value);
  }
}
