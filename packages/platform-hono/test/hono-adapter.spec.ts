import "reflect-metadata";
import { describe, it, expect, beforeEach, spyOn, mock } from "bun:test";
import { HonoAdapter } from "../src/hono-adapter";

describe("HonoAdapter", () => {
  let adapter: HonoAdapter;

  beforeEach(() => {
    adapter = new HonoAdapter();
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  describe("Serverless & Web Standard Compatibility", () => {
    it("should expose a compliant fetch handler", async () => {
      adapter.get("/edge", () => "Running on Edge");

      const req = new Request("http://localhost/edge");
      const res = await adapter.fetch(req);

      expect(res).toBeInstanceOf(Response);
      expect(await res.text()).toBe("Running on Edge");
    });
  });

  describe("Response Normalization", () => {
    it("should automatically convert objects to JSON", async () => {
      const data = { framework: "Karin-JS" };
      // En tu código usas normalizeResponse, probemos que funciona
      adapter.get("/json", () => data);

      const req = new Request("http://localhost/json");
      const res = await adapter.fetch(req);

      expect(res.headers.get("content-type")).toInclude("application/json");
      expect(await res.json()).toEqual(data);
    });

    it("should handle null/undefined as 204 No Content", async () => {
      adapter.get("/empty", () => null);

      const req = new Request("http://localhost/empty");
      const res = await adapter.fetch(req);

      expect(res.status).toBe(204);
      expect(await res.text()).toBe("");
    });

    it("should pass through native Response objects", async () => {
      adapter.get("/native", () => new Response("Custom", { status: 201 }));

      const req = new Request("http://localhost/native");
      const res = await adapter.fetch(req);

      expect(res.status).toBe(201);
      expect(await res.text()).toBe("Custom");
    });
  });

  describe("Request Parsing", () => {
    it("should parse JSON body", async () => {
      const payload = { name: "Hono" };

      adapter.post("/body", async (ctx) => {
        return await adapter.readBody(ctx);
      });

      const req = new Request("http://localhost/body", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const res = await adapter.fetch(req);
      expect(await res.json()).toEqual(payload);
    });

    it("should return undefined for invalid JSON (fail safe)", async () => {
      // En tu implementación de HonoAdapter usas try/catch que retorna undefined
      adapter.post("/safe-body", async (ctx) => {
        const body = await adapter.readBody(ctx);
        return { bodyIsUndefined: body === undefined };
      });

      const req = new Request("http://localhost/safe-body", {
        method: "POST",
        body: "{ broken",
        headers: { "Content-Type": "application/json" },
      });

      const res = await adapter.fetch(req);
      const data = (await res.json()) as any;
      expect(data.bodyIsUndefined).toBe(true);
    });

    it("should extract query params", async () => {
      adapter.get("/query", (ctx) => adapter.getQuery(ctx));

      const req = new Request("http://localhost/query?q=search");
      const res = await adapter.fetch(req);

      expect(await res.json()).toEqual({ q: "search" });
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
