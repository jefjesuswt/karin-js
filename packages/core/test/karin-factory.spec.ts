import "reflect-metadata";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import type { IHttpAdapter } from "../src/interfaces";
import { KarinFactory } from "../src/karin.factory";
import { KarinApplication } from "../src/karin.application";
// 👇 Importamos la clase real, no la mockeamos

describe("KarinFactory", () => {
  const mockAdapter = {
    listen: mock(),
    // Agregamos métodos dummy que RouterExplorer podría llamar al instanciarse
    get: mock(),
    post: mock(),
    put: mock(),
    delete: mock(),
    patch: mock(),
  } as unknown as IHttpAdapter;

  const originalLog = console.log;

  beforeEach(() => {
    console.log = mock(() => {});
  });

  afterEach(() => {
    console.log = originalLog;
    mock.restore();
  });

  it("create() should return a KarinApplication instance", async () => {
    // Usamos scan vacío para no intentar leer disco real
    // Al no encontrar archivos, RouterExplorer no hará nada pesado
    const app = await KarinFactory.create(mockAdapter, {
      scan: "invalid/path/*.ts",
    });

    expect(app).toBeInstanceOf(KarinApplication);
  });
});
