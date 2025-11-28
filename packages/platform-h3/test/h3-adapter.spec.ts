import "reflect-metadata";
import { describe, it, expect, mock } from "bun:test";
import { H3Adapter } from "../src/h3-adapter";

const originalServe = Bun.serve;
Bun.serve = mock(() => ({ stop: () => {} } as any));

describe("H3Adapter", () => {
  it("should be defined", () => {
    const adapter = new H3Adapter();
    expect(adapter).toBeDefined();
  });

  it("should register routes internally", () => {
    const adapter = new H3Adapter();
    // Como app es privada, probamos que los métodos no exploten
    expect(() => adapter.get("/", () => {})).not.toThrow();
    expect(() => adapter.post("/", () => {})).not.toThrow();
  });

  // 👇 NOTA: Para probar el flujo de petición/respuesta en H3 sin getters públicos,
  // tendríamos que hacer malabares. Lo ideal es exponer 'toWebHandler' o 'fetch'.
  // Asumiendo que agregaremos 'public get app' o similar en el futuro.
  // Por ahora, simulamos una prueba de integración ligera si tuvieramos acceso.

  it("should normalize response string to text", async () => {
    // Este test requiere el getter 'fetch' o acceder a (adapter as any).app
    const adapter = new H3Adapter();
    adapter.get("/hello", () => "World");

    // Hack temporal para testear sin modificar el código fuente todavía
    // En una implementación real, agrega: public get fetch() { return toWebHandler(this.app); }
    const h3App = (adapter as any).app;
    const { toWebHandler } = await import("h3");
    const fetchHandler = toWebHandler(h3App);

    const req = new Request("http://localhost/hello");
    const res = await fetchHandler(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("World");
  });

  it("should parse JSON body via readBody", async () => {
    const adapter = new H3Adapter();
    adapter.post("/echo", async (event) => {
      return await adapter.readBody(event);
    });

    const h3App = (adapter as any).app;
    const { toWebHandler } = await import("h3");
    const fetchHandler = toWebHandler(h3App);

    const data = { msg: "h3 rocks" };
    const req = new Request("http://localhost/echo", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });

    const res = await fetchHandler(req);
    expect(await res.json()).toEqual(data);
  });
});
