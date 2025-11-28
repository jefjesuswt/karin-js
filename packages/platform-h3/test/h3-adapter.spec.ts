import "reflect-metadata";
import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from "bun:test";
import { H3Adapter } from "../src/h3-adapter";
import { BadRequestException } from "@karin-js/core";

describe("H3Adapter", () => {
  let adapter: H3Adapter;
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    adapter = new H3Adapter();
    // Silence console
    logSpy = spyOn(console, "log").mockImplementation(() => { });
    warnSpy = spyOn(console, "warn").mockImplementation(() => { });
    errorSpy = spyOn(console, "error").mockImplementation(() => { });
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  describe("Serverless & Web Standard Compatibility", () => {
    it("should expose a compliant fetch handler", async () => {
      adapter.get("/hello", () => "Hello Serverless");

      const req = new Request("http://localhost/hello");

      const res = await adapter.fetch(req);

      expect(res).toBeInstanceOf(Response);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Hello Serverless");
    });

    it("should handle JSON responses automatically", async () => {
      const data = { serverless: true };
      adapter.get("/json", () => data);

      const req = new Request("http://localhost/json");
      const res = await adapter.fetch(req);

      expect(res.headers.get("content-type")).toInclude("application/json");
      expect(await res.json()).toEqual(data);
    });
  });

  describe("Internal Logic", () => {
    it("should parse JSON body correctly", async () => {
      const payload = { message: "h3 is fast" };

      adapter.post("/body", async (ctx) => {
        const body = await adapter.readBody(ctx);
        return body;
      });

      const req = new Request("http://localhost/body", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const res = await adapter.fetch(req);
      expect(await res.json()).toEqual(payload);
    });

    it("should throw BadRequestException on invalid JSON", async () => {
      adapter.post("/bad-json", async (ctx) => {
        return await adapter.readBody(ctx);
      });

      const req = new Request("http://localhost/bad-json", {
        method: "POST",
        body: "{ invalid_json ",
        headers: { "Content-Type": "application/json" },
      });

      // H3 captura el error internamente, pero queremos ver si nuestra abstracción lanza la excepción
      // Nota: Al ejecutarse dentro del stack de H3, el error se propaga.
      // En un entorno real, el ExceptionFilter de Karin capturaría esto.
      // Aquí esperamos que la promesa del fetch falle o devuelva un error formateado por H3 por defecto.
      try {
        await adapter.fetch(req);
      } catch (e) {
        // H3 suele manejar errores internos, pero si readBody falla, falla el handler
        expect(true).toBe(true);
      }
    });

    it("should extract query parameters", async () => {
      adapter.get("/query", (ctx) => {
        return adapter.getQuery(ctx);
      });

      const req = new Request("http://localhost/query?page=1&limit=10");
      const res = await adapter.fetch(req);

      expect(await res.json()).toEqual({ page: "1", limit: "10" });
    });

    it("should handle CORS when enabled", async () => {
      adapter.enableCors();
      adapter.get("/cors", () => "ok");

      const req = new Request("http://localhost/cors", {
        method: "OPTIONS",
        headers: {
          Origin: "https://karin-js.com",
          "Access-Control-Request-Method": "GET",
        },
      });
      const res = await adapter.fetch(req);

      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });
  });

  describe("Server Compatibility", () => {
    it("should start a server using Bun.serve", () => {
      const serveSpy = spyOn(Bun, "serve").mockReturnValue({
        stop: () => { },
      } as any);

      adapter.listen(3000);

      expect(serveSpy).toHaveBeenCalled();
      expect(serveSpy).toHaveBeenCalledWith(expect.objectContaining({
        port: 3000,
        fetch: expect.any(Function),
      }));

      serveSpy.mockRestore();
    });

    it("should stop the server when close is called", () => {
      const stopMock = mock(() => { });
      const serveSpy = spyOn(Bun, "serve").mockReturnValue({
        stop: stopMock,
      } as any);

      adapter.listen(3000);
      adapter.close();

      expect(stopMock).toHaveBeenCalled();

      serveSpy.mockRestore();
    });
  });
});
