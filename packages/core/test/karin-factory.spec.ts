import "reflect-metadata";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import type { IHttpAdapter, KarinPlugin, ExceptionFilter, CanActivate, PipeTransform } from "../src/interfaces";
import { KarinFactory } from "../src/karin.factory";
import { KarinApplication } from "../src/karin.application";
import { Controller, Get } from "../src/decorators";

describe("KarinFactory", () => {
  const mockAdapter = {
    listen: mock(),
    get: mock(),
    post: mock(),
    put: mock(),
    delete: mock(),
    patch: mock(),
  } as unknown as IHttpAdapter;

  const originalLog = console.log;

  beforeEach(() => {
    console.log = mock(() => { });
  });

  afterEach(() => {
    console.log = originalLog;
    mock.restore();
  });

  describe("create()", () => {
    it("should return a KarinApplication instance", async () => {
      const app = await KarinFactory.create(mockAdapter, {
        scan: "invalid/path/*.ts",
      });

      expect(app).toBeInstanceOf(KarinApplication);
    });

    it("should register plugins before scanning", async () => {
      const installMock = mock();
      const mockPlugin: KarinPlugin = {
        name: "TestPlugin",
        install: installMock,
      };

      const app = await KarinFactory.create(mockAdapter, {
        scan: "invalid/path/*.ts",
        plugins: [mockPlugin],
      });

      expect(installMock).toHaveBeenCalledWith(app);
    });

    it("should register multiple plugins in order", async () => {
      const calls: string[] = [];

      const plugin1: KarinPlugin = {
        name: "Plugin1",
        install: () => { calls.push("plugin1"); },
      };

      const plugin2: KarinPlugin = {
        name: "Plugin2",
        install: () => { calls.push("plugin2"); },
      };

      const plugin3: KarinPlugin = {
        name: "Plugin3",
        install: () => { calls.push("plugin3"); },
      };

      await KarinFactory.create(mockAdapter, {
        scan: "invalid/path/*.ts",
        plugins: [plugin1, plugin2, plugin3],
      });

      expect(calls).toEqual(["plugin1", "plugin2", "plugin3"]);
    });

    it("should register global filters before scanning", async () => {
      const mockFilter: ExceptionFilter = {
        catch: mock(),
      };

      const app = await KarinFactory.create(mockAdapter, {
        scan: "invalid/path/*.ts",
        globalFilters: [mockFilter],
      });

      const filters = app.getGlobalFilters();
      expect(filters).toContain(mockFilter);
    });

    it("should register global guards before scanning", async () => {
      const mockGuard: CanActivate = {
        canActivate: mock(() => true),
      };

      const app = await KarinFactory.create(mockAdapter, {
        scan: "invalid/path/*.ts",
        globalGuards: [mockGuard],
      });

      const guards = app.getGlobalGuards();
      expect(guards).toContain(mockGuard);
    });

    it("should register global pipes before scanning", async () => {
      const mockPipe: PipeTransform = {
        transform: mock((v) => v),
      };

      const app = await KarinFactory.create(mockAdapter, {
        scan: "invalid/path/*.ts",
        globalPipes: [mockPipe],
      });

      const pipes = app.getGlobalPipes();
      expect(pipes).toContain(mockPipe);
    });

    it("should register plugins before global filters/guards/pipes", async () => {
      const order: string[] = [];

      const mockPlugin: KarinPlugin = {
        name: "TestPlugin",
        install: () => { order.push("plugin"); },
      };

      const mockFilter: ExceptionFilter = {
        catch: () => {
          order.push("filter");
          return new Response();
        },
      };

      await KarinFactory.create(mockAdapter, {
        scan: "invalid/path/*.ts",
        plugins: [mockPlugin],
        globalFilters: [mockFilter],
      });

      // Plugin should be installed before filters
      expect(order[0]).toBe("plugin");
    });

    it("should work with manual controllers registration", async () => {
      @Controller("/test")
      class TestController {
        @Get()
        test() {
          return "test";
        }
      }

      const app = await KarinFactory.create(mockAdapter, {
        controllers: [TestController],
        scan: false,
      });

      expect(app).toBeInstanceOf(KarinApplication);
      expect(mockAdapter.get).toHaveBeenCalled();
    });

    it("should support both manual controllers and scanning", async () => {
      @Controller("/manual")
      class ManualController {
        @Get()
        test() {
          return "manual";
        }
      }

      const app = await KarinFactory.create(mockAdapter, {
        controllers: [ManualController],
        scan: "invalid/path/*.ts", // Will scan but find nothing
      });

      expect(app).toBeInstanceOf(KarinApplication);
    });

    it("should handle empty options", async () => {
      const app = await KarinFactory.create(mockAdapter, {});
      expect(app).toBeInstanceOf(KarinApplication);
    });

    it("should handle all options together", async () => {
      const mockPlugin: KarinPlugin = {
        name: "TestPlugin",
        install: mock(),
      };

      const mockFilter: ExceptionFilter = {
        catch: mock(),
      };

      const mockGuard: CanActivate = {
        canActivate: mock(() => true),
      };

      const mockPipe: PipeTransform = {
        transform: mock((v) => v),
      };

      @Controller("/test")
      class TestController {
        @Get()
        test() {
          return "test";
        }
      }

      const app = await KarinFactory.create(mockAdapter, {
        scan: "invalid/path/*.ts",
        controllers: [TestController],
        plugins: [mockPlugin],
        globalFilters: [mockFilter],
        globalGuards: [mockGuard],
        globalPipes: [mockPipe],
      });

      expect(app).toBeInstanceOf(KarinApplication);
      expect(mockPlugin.install).toHaveBeenCalled();
      expect(app.getGlobalFilters()).toContain(mockFilter);
      expect(app.getGlobalGuards()).toContain(mockGuard);
      expect(app.getGlobalPipes()).toContain(mockPipe);
    });
  });

  describe("Initialization Order", () => {
    it("should follow correct initialization order", async () => {
      const order: string[] = [];

      const plugin: KarinPlugin = {
        name: "TestPlugin",
        install: () => { order.push("1-plugin-install"); },
        onPluginInit: async () => { order.push("5-plugin-init"); },
      };

      const filter: ExceptionFilter = {
        catch: () => {
          order.push("2-filter-register");
          return new Response();
        },
      };

      const guard: CanActivate = {
        canActivate: () => {
          order.push("3-guard-register");
          return true;
        },
      };

      const pipe: PipeTransform = {
        transform: (v) => {
          order.push("4-pipe-register");
          return v;
        },
      };

      const app = await KarinFactory.create(mockAdapter, {
        scan: false,
        plugins: [plugin],
        globalFilters: [filter],
        globalGuards: [guard],
        globalPipes: [pipe],
      });

      // Plugins should be installed first
      expect(order[0]).toBe("1-plugin-install");

      // Init plugins
      await app.init();

      // Plugin init should be called during app.init()
      expect(order).toContain("5-plugin-init");
    });
  });
});
