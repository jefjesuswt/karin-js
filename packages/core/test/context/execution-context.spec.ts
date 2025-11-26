import { describe, it, expect, mock } from "bun:test";
import type { IHttpAdapter } from "../../src/interfaces";
import { KarinExecutionContext } from "../../src/context/execution-context";

describe("KarinExecutionContext", () => {
  const mockAdapter = {
    getRequest: mock(() => ({ url: "http://test.com" })),
    getResponse: mock(() => ({ body: "ok" })),
    getNext: mock(() => null),
  } as unknown as IHttpAdapter;

  const mockPlatformCtx = { req: {}, res: {} };
  class TestController {}
  const testHandler = () => {};

  it("should be instantiated correctly", () => {
    const ctx = new KarinExecutionContext(
      mockAdapter,
      mockPlatformCtx,
      TestController,
      testHandler
    );

    expect(ctx.getClass()).toBe(TestController);
    expect(ctx.getHandler()).toBe(testHandler);
  });

  it("should delegate getRequest to the adapter", () => {
    const ctx = new KarinExecutionContext(
      mockAdapter,
      mockPlatformCtx,
      TestController,
      testHandler
    );

    const req = ctx.getRequest();
    expect(req).toEqual({ url: "http://test.com" });
    expect(mockAdapter.getRequest).toHaveBeenCalledWith(mockPlatformCtx);
  });

  it("switchToHttp should return the same instance", () => {
    const ctx = new KarinExecutionContext(
      mockAdapter,
      mockPlatformCtx,
      TestController,
      testHandler
    );
    expect(ctx.switchToHttp()).toBe(ctx);
  });
});
