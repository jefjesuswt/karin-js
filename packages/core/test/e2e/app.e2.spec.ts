import "reflect-metadata";
import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { KarinFactory } from "../../src/karin.factory";
import { HonoAdapter } from "../../../platform-hono/src/hono-adapter";
import { Controller } from "../../src/decorators/controller";
import { Get, Post } from "../../src/decorators/http";
import { Body } from "../../src/decorators/params";

// 1. Definimos una App de prueba real (Controlador en memoria)
@Controller("/e2e")
class E2EController {
  @Get("/ping")
  ping() {
    return { message: "pong" };
  }

  @Post("/echo")
  echo(@Body() body: any) {
    return body;
  }
}

describe("E2E: System Integration", () => {
  const PORT = 4000;
  const BASE_URL = `http://localhost:${PORT}`;
  let app: any;

  beforeAll(async () => {
    // 2. Arrancamos la aplicación real con la nueva opción 'controllers'
    app = await KarinFactory.create(new HonoAdapter(), {
      controllers: [E2EController], // ✅ Sin escanear disco, directo a la memoria
    });

    // Arrancamos el servidor
    // Nota: Como app.listen no es async en esta versión, damos un pequeño respiro
    // para asegurar que el socket se abra antes de lanzar los fetch.
    app.listen(PORT);
    await new Promise((r) => setTimeout(r, 50));
  });

  afterAll(() => {
    // Nota: Actualmente Karin no expone un método app.close().
    // Confiamos en que Bun Test cierra los recursos abiertos al terminar la suite.
    // TODO: Implementar Graceful Shutdown en v0.3.0
  });

  it("GET /e2e/ping should return 200 OK", async () => {
    const res = await fetch(`${BASE_URL}/e2e/ping`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ message: "pong" });
  });

  it("POST /e2e/echo should return body", async () => {
    const payload = { hello: "world" };
    const res = await fetch(`${BASE_URL}/e2e/echo`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(payload);
  });
});
