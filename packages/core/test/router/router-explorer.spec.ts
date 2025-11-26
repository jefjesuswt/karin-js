import "reflect-metadata";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { container } from "tsyringe";
import { RouterExplorer } from "../../src/router/router-explorer";
import { Controller } from "../../src/decorators/controller";
import { Get } from "../../src/decorators/http";
import { UseGuards } from "../../src/decorators/core";
import { UseFilters } from "../../src/decorators/filters";
import type {
  IHttpAdapter,
  CanActivate,
  ExecutionContext,
  ExceptionFilter,
  KarinInterceptor,
  CallHandler,
} from "../../src/interfaces";
import { KarinApplication } from "../../src/karin.application";
import { UseInterceptors } from "../../src/decorators/interceptor";

// --- Mocks y Clases de Prueba ---

const mockGuardCanActivate = mock((...args: any[]) => true);

class TestGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    return mockGuardCanActivate(context);
  }
}

class TestExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: any) {
    return "Intercepted by Filter";
  }
}

class TransformInterceptor implements KarinInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const result = await next.handle();
    return `Modified: ${result}`;
  }
}

@Controller("/test")
@UseGuards(TestGuard)
class TestController {
  @Get("/hello")
  hello() {
    return "world";
  }

  @Get("/error")
  @UseFilters(new TestExceptionFilter())
  error() {
    throw new Error("Boom");
  }

  @Get("/intercepted")
  @UseInterceptors(TransformInterceptor)
  withInterceptor() {
    return "original data";
  }
}

describe("RouterExplorer", () => {
  let mockAdapter: any;
  let app: KarinApplication;
  let explorer: RouterExplorer;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    container.reset();
    mockGuardCanActivate.mockClear();
    console.log = mock(() => {});

    mockAdapter = {
      get: mock((path: string, handler: Function) => {}),
      post: mock(),
      create: mock(),
      listen: mock(),
      getRequest: mock(() => ({})),
      getResponse: mock(() => ({})),
    };

    app = new KarinApplication(mockAdapter as IHttpAdapter);
    explorer = new RouterExplorer(mockAdapter as IHttpAdapter);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it("should correctly register routes and HTTP verbs", () => {
    explorer.explore(app, TestController);
    expect(mockAdapter.get).toHaveBeenCalled();
    const calls = mockAdapter.get.mock.calls;
    const helloCall = calls.find((call: any[]) => call[0] === "/test/hello");
    expect(helloCall).toBeDefined();
  });

  it("should execute Guards when the route is called", async () => {
    explorer.explore(app, TestController);
    const calls = mockAdapter.get.mock.calls;
    const helloCall = calls.find((call: any[]) => call[0] === "/test/hello");

    // Verificación de seguridad para evitar TypeError
    expect(helloCall).toBeDefined();
    if (!helloCall) return;

    const registeredHandler = helloCall[1];
    const mockCtx = {};
    const result = await registeredHandler(mockCtx);

    expect(mockGuardCanActivate).toHaveBeenCalled();
    expect(result).toBe("world");
  });

  it("should catch errors and use ExceptionFilters", async () => {
    explorer.explore(app, TestController);
    const calls = mockAdapter.get.mock.calls;
    const errorCall = calls.find((call: any[]) => call[0] === "/test/error");

    // Verificación de seguridad
    expect(errorCall).toBeDefined();
    if (!errorCall) return;

    const registeredHandler = errorCall[1];
    const result = await registeredHandler({});

    expect(result).toBe("Intercepted by Filter");
  });

  it("should execute Interceptors and transform the response", async () => {
    explorer.explore(app, TestController);

    const calls = mockAdapter.get.mock.calls;
    const interceptedCall = calls.find(
      (call: any[]) => call[0] === "/test/intercepted"
    );

    // Verificación de seguridad
    expect(interceptedCall).toBeDefined();
    if (!interceptedCall) return;

    const registeredHandler = interceptedCall[1];
    const result = await registeredHandler({});

    expect(result).toBe("Modified: original data");
  });
});
