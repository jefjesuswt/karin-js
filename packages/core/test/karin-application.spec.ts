import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { KarinApplication, type IHttpAdapter, type KarinPlugin } from "..";

describe("KarinApplication", () => {
  const mockAdapter = {
    listen: mock(),
    enableCors: mock(),
  } as unknown as IHttpAdapter;

  const originalLog = console.log;

  beforeEach(() => {
    // 👇 Silenciamos dentro del beforeEach
    console.log = mock(() => {});
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("should register plugins correctly", () => {
    const app = new KarinApplication(mockAdapter);

    const mockPlugin: KarinPlugin = {
      name: "TestPlugin",
      install: mock(),
    };

    app.use(mockPlugin);

    expect(mockPlugin.install).toHaveBeenCalledWith(app);
  });

  it("should execute onModuleInit lifecycle hook on initialization", async () => {
    const app = new KarinApplication(mockAdapter);

    const mockPlugin: KarinPlugin = {
      name: "DBPlugin",
      install: () => {},
      onModuleInit: mock(async () => {}),
    };

    app.use(mockPlugin);
    await app.init();

    expect(mockPlugin.onModuleInit).toHaveBeenCalled();
  });

  it("should delegate enableCors to the adapter", () => {
    const app = new KarinApplication(mockAdapter);
    app.enableCors({ origin: "*" });
    expect(mockAdapter.enableCors).toHaveBeenCalled();
  });
});
